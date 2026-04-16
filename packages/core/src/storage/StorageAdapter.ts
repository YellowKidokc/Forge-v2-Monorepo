// Import the Annotation types from annotations module
import type { Annotation, LayerConfig, ImportResult } from '../annotations/types';
import type { SectionMeta, SlotValue, HeaderDrawerState } from '../lib/headerDrawer';
import type { ForgeTemplate } from '../lib/templates';

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}

export interface StorageAdapter {
  // Vault
  setVault(path: string): Promise<string>;
  getVaultFiles(): Promise<FileEntry[]>;

  // Notes
  readNote(path: string): Promise<string>;
  writeNote(path: string, content: string): Promise<void>;
  createNote(path: string): Promise<string>;
  createFolder(path: string): Promise<void>;
  renameItem(oldPath: string, newPath: string): Promise<void>;
  deleteItem(path: string): Promise<void>;

  // Annotations
  saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void>;
  loadAnnotations(documentId: string): Promise<Annotation[]>;
  saveLayerConfig(config: LayerConfig): Promise<void>;
  loadLayerConfig(): Promise<LayerConfig>;

  // Data import
  importData(source: string, format: 'csv' | 'json' | 'xlsx', layerId: string): Promise<ImportResult>;

  // Header Drawer — section metadata
  saveDrawerState(documentId: string, state: HeaderDrawerState): Promise<void>;
  loadDrawerState(documentId: string): Promise<Partial<HeaderDrawerState> | null>;
  upsertSlotValue(sectionId: string, slotIndex: number, value: SlotValue): Promise<void>;
  getInheritedValues(sectionId: string): Promise<SlotValue[]>;

  // Templates
  listTemplates(): Promise<ForgeTemplate[]>;
  getTemplate(templateId: string): Promise<ForgeTemplate | null>;
}
