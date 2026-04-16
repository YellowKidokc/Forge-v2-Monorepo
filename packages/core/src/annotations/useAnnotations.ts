import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from '../storage/StorageContext';
import type { Annotation, AnnotationSlot, LayerConfig, MarkerStyle } from './types';
import { createDefaultLayerConfig, createDefaultSlots } from './types';

export function useAnnotations(documentId: string | null) {
  const storage = useStorage();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(createDefaultLayerConfig());
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Load annotations when document changes
  useEffect(() => {
    if (!documentId) return;
    storage.loadAnnotations(documentId).then(setAnnotations).catch(() => setAnnotations([]));
    storage.loadLayerConfig().then(setLayerConfig).catch(() => setLayerConfig(createDefaultLayerConfig()));
  }, [documentId, storage]);

  // Filter by visible layers
  const visibleAnnotations = useMemo(() => {
    const visibleLayerIds = new Set(layerConfig.layers.filter(l => l.visible).map(l => l.id));
    return annotations.filter(a => visibleLayerIds.has(a.layerId));
  }, [annotations, layerConfig]);

  // Save helper
  const persist = useCallback(async (updated: Annotation[]) => {
    if (!documentId) return;
    setAnnotations(updated);
    await storage.saveAnnotations(documentId, updated);
  }, [documentId, storage]);

  // CRUD
  const addAnnotation = useCallback(async (
    anchor: Annotation['anchor'],
    layerId: string,
    markerStyle?: MarkerStyle,
  ): Promise<Annotation> => {
    const layer = layerConfig.layers.find(l => l.id === layerId);
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentId: documentId || '',
      anchor,
      slots: createDefaultSlots(layer?.defaultSlotLayout || layerConfig.defaultLayout),
      layerId,
      markerStyle: markerStyle || layer?.markerStyle || layerConfig.defaultMarkerStyle,
      parentId: null,
      childIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persist([...annotations, newAnnotation]);
    setActiveAnnotationId(newAnnotation.id);
    return newAnnotation;
  }, [annotations, documentId, layerConfig, persist]);

  const updateAnnotation = useCallback(async (id: string, updates: Partial<Annotation>) => {
    const updated = annotations.map(a => a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a);
    await persist(updated);
  }, [annotations, persist]);

  const removeAnnotation = useCallback(async (id: string) => {
    await persist(annotations.filter(a => a.id !== id));
    if (activeAnnotationId === id) setActiveAnnotationId(null);
  }, [annotations, activeAnnotationId, persist]);

  const updateSlot = useCallback(async (annotationId: string, slotId: string, updates: Partial<AnnotationSlot>) => {
    const updated = annotations.map(a => {
      if (a.id !== annotationId) return a;
      return {
        ...a,
        slots: a.slots.map(s => s.id === slotId ? { ...s, ...updates } : s),
        updatedAt: Date.now(),
      };
    });
    await persist(updated);
  }, [annotations, persist]);

  // Layer management
  const toggleLayer = useCallback(async (layerId: string) => {
    const newConfig = {
      ...layerConfig,
      layers: layerConfig.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l),
    };
    setLayerConfig(newConfig);
    await storage.saveLayerConfig(newConfig);
  }, [layerConfig, storage]);

  const updateLayerConfig = useCallback(async (config: LayerConfig) => {
    setLayerConfig(config);
    await storage.saveLayerConfig(config);
  }, [storage]);

  // Query
  const getAnnotationsAtLine = useCallback((lineNumber: number) => {
    return visibleAnnotations.filter(a => a.anchor.lineNumber === lineNumber);
  }, [visibleAnnotations]);

  const getAnnotationsAtGrid = useCallback((row: number, col: number) => {
    return visibleAnnotations.filter(a => a.gridAddress?.row === row && a.gridAddress?.col === col);
  }, [visibleAnnotations]);

  return {
    annotations,
    visibleAnnotations,
    layerConfig,
    activeAnnotationId,
    setActiveAnnotationId,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    updateSlot,
    toggleLayer,
    updateLayerConfig,
    getAnnotationsAtLine,
    getAnnotationsAtGrid,
  };
}
