import { invoke } from '@tauri-apps/api/core';
import type { StorageAdapter, FileEntry } from '@forge/core';
import type { Annotation, LayerConfig, ImportResult } from '@forge/core';

export class TauriStorageAdapter implements StorageAdapter {
  async setVault(path: string): Promise<string> {
    return invoke<string>('set_vault', { path });
  }

  async getVaultFiles(): Promise<FileEntry[]> {
    return invoke<FileEntry[]>('get_vault_files');
  }

  async readNote(path: string): Promise<string> {
    return invoke<string>('read_note', { path });
  }

  async writeNote(path: string, content: string): Promise<void> {
    await invoke('write_note', { path, content });
  }

  async createNote(path: string): Promise<string> {
    return invoke<string>('create_note', { path });
  }

  async createFolder(path: string): Promise<void> {
    await invoke('create_folder', { path });
  }

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    await invoke('rename_item', { oldPath, newPath });
  }

  async deleteItem(path: string): Promise<void> {
    await invoke('delete_item', { path });
  }

  // Annotations - stored as JSON files in _annotations/ folder
  async saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void> {
    const path = `_annotations/${encodeURIComponent(documentId)}.json`;
    await this.writeNote(path, JSON.stringify(annotations, null, 2));
  }

  async loadAnnotations(documentId: string): Promise<Annotation[]> {
    try {
      const path = `_annotations/${encodeURIComponent(documentId)}.json`;
      const content = await this.readNote(path);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async saveLayerConfig(config: LayerConfig): Promise<void> {
    await this.writeNote('_forge/annotation-layers.json', JSON.stringify(config, null, 2));
  }

  async loadLayerConfig(): Promise<LayerConfig> {
    try {
      const content = await this.readNote('_forge/annotation-layers.json');
      return JSON.parse(content);
    } catch {
      const { createDefaultLayerConfig } = await import('@forge/core');
      return createDefaultLayerConfig();
    }
  }

  async importData(_source: string, _format: 'csv' | 'json' | 'xlsx', _layerId: string): Promise<ImportResult> {
    // TODO: implement with Tauri file picker + parser
    return { success: false, rowsImported: 0, errors: ['Import not yet implemented'], layerId: _layerId };
  }
}
