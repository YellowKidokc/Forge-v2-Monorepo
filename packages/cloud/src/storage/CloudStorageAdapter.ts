import type { StorageAdapter, FileEntry } from '@forge/core';
import type { Annotation, LayerConfig, ImportResult } from '@forge/core';

export class CloudStorageAdapter implements StorageAdapter {
  constructor(private baseUrl: string, private token?: string) {}

  private async api<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async setVault(path: string): Promise<string> { return this.api('/vault', { method: 'POST', body: JSON.stringify({ path }) }); }
  async getVaultFiles(): Promise<FileEntry[]> { return this.api('/vault/files'); }
  async readNote(path: string): Promise<string> { return this.api(`/notes/${encodeURIComponent(path)}`); }
  async writeNote(path: string, content: string): Promise<void> { await this.api(`/notes/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify({ content }) }); }
  async createNote(path: string): Promise<string> { return this.api('/notes', { method: 'POST', body: JSON.stringify({ path }) }); }
  async createFolder(path: string): Promise<void> { await this.api('/folders', { method: 'POST', body: JSON.stringify({ path }) }); }
  async renameItem(oldPath: string, newPath: string): Promise<void> { await this.api('/items/rename', { method: 'POST', body: JSON.stringify({ oldPath, newPath }) }); }
  async deleteItem(path: string): Promise<void> { await this.api(`/items/${encodeURIComponent(path)}`, { method: 'DELETE' }); }
  async saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void> { await this.api(`/annotations/${encodeURIComponent(documentId)}`, { method: 'PUT', body: JSON.stringify(annotations) }); }
  async loadAnnotations(documentId: string): Promise<Annotation[]> { return this.api(`/annotations/${encodeURIComponent(documentId)}`); }
  async saveLayerConfig(config: LayerConfig): Promise<void> { await this.api('/layers', { method: 'PUT', body: JSON.stringify(config) }); }
  async loadLayerConfig(): Promise<LayerConfig> { return this.api('/layers'); }
  async importData(source: string, format: 'csv' | 'json' | 'xlsx', layerId: string): Promise<ImportResult> { return this.api('/import', { method: 'POST', body: JSON.stringify({ source, format, layerId }) }); }
}
