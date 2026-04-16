/**
 * useHeaderDrawer — React hook that manages header drawer state.
 *
 * Scans the editor document for heading nodes, builds section metadata,
 * resolves inheritance, and provides CRUD for slot values.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import type { UseGridReturn } from './useGrid';
import {
  HeaderDrawerState,
  SectionMeta,
  SlotValue,
  GutterState,
  createDefaultDrawerState,
  upsertSection,
  updateSlotValue,
  toggleDrawer,
  toggleExpandAll,
  resolveInheritedValues,
  cycleGutterState,
  toggleLeftGutter,
  toggleRightGutter,
  saveDrawerState,
  loadDrawerState,
} from '../lib/headerDrawer';

export function useHeaderDrawer(editor: Editor | null, grid: UseGridReturn, documentId?: string | null) {
  const [state, setState] = useState<HeaderDrawerState>(createDefaultDrawerState);
  const syncTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  // Load persisted state
  useEffect(() => {
    if (!documentId) return;
    const saved = loadDrawerState(documentId);
    if (saved) {
      setState(prev => ({
        ...prev,
        ...saved,
        slotDefinitions: prev.slotDefinitions, // Keep slot defs from code, not storage
      }));
    }
    loadedRef.current = true;
  }, [documentId]);

  // Persist state on change
  useEffect(() => {
    if (!documentId || !loadedRef.current) return;
    saveDrawerState(documentId, state);
  }, [state, documentId]);

  // Sync sections from grid snapshot
  const syncSections = useCallback(() => {
    if (!editor) return;

    const headingRows = grid.snapshot.rows.filter(
      r => r.nodeType === 'heading' && r.level
    );

    if (headingRows.length === 0) return;

    setState(prev => {
      let next = { ...prev };

      // Build a stack to track parent headers
      const parentStack: { sectionId: string; level: number }[] = [];

      for (const row of headingRows) {
        const sectionId = row.nodeId;
        const level = row.level || 1;
        const title = row.cells.map(c => c.word).join(' ');

        // Pop the stack until we find a parent with a lower level
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
          parentStack.pop();
        }

        const parentSectionId = parentStack.length > 0
          ? parentStack[parentStack.length - 1].sectionId
          : null;

        next = upsertSection(next, sectionId, level, title, parentSectionId, row.index);
        parentStack.push({ sectionId, level });
      }

      return next;
    });
  }, [editor, grid.snapshot]);

  // Debounced sync on grid changes
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(syncSections, 500);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [syncSections]);

  // ── Section Query ──

  const getSections = useCallback((): SectionMeta[] => {
    return Object.values(state.sections).sort((a, b) => a.gridRowIndex - b.gridRowIndex);
  }, [state.sections]);

  const getSection = useCallback((sectionId: string): SectionMeta | null => {
    return state.sections[sectionId] || null;
  }, [state.sections]);

  const getResolvedSlots = useCallback((sectionId: string): SlotValue[] => {
    return resolveInheritedValues(sectionId, state);
  }, [state]);

  // ── Drawer Actions ──

  const openDrawer = useCallback((sectionId: string) => {
    setState(prev => toggleDrawer(prev, sectionId, true));
  }, []);

  const closeDrawer = useCallback((sectionId: string) => {
    setState(prev => toggleDrawer(prev, sectionId, false));
  }, []);

  const toggle = useCallback((sectionId: string) => {
    setState(prev => toggleDrawer(prev, sectionId));
  }, []);

  const setSlotValue = useCallback((sectionId: string, slotIndex: number, value: string | string[] | number | boolean | null) => {
    setState(prev => updateSlotValue(prev, sectionId, slotIndex, value));
  }, []);

  const expandAll = useCallback(() => {
    setState(prev => toggleExpandAll(prev));
  }, []);

  // ── Gutter Actions ──

  const cycleGutter = useCallback(() => {
    setState(prev => ({ ...prev, gutterState: cycleGutterState(prev.gutterState) }));
  }, []);

  const toggleLeft = useCallback(() => {
    setState(prev => ({ ...prev, gutterState: toggleLeftGutter(prev.gutterState) }));
  }, []);

  const toggleRight = useCallback(() => {
    setState(prev => ({ ...prev, gutterState: toggleRightGutter(prev.gutterState) }));
  }, []);

  const setLeftGutterWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, leftGutterWidth: Math.max(120, width) }));
  }, []);

  const setRightGutterWidth = useCallback((width: number) => {
    setState(prev => ({ ...prev, rightGutterWidth: Math.max(140, width) }));
  }, []);

  return {
    state,
    slotDefinitions: state.slotDefinitions,
    gutterState: state.gutterState as GutterState,
    leftGutterWidth: state.leftGutterWidth,
    rightGutterWidth: state.rightGutterWidth,
    isExpandAll: state.expandAll,

    // Section queries
    getSections,
    getSection,
    getResolvedSlots,

    // Drawer actions
    openDrawer,
    closeDrawer,
    toggle,
    setSlotValue,
    expandAll,

    // Gutter actions
    cycleGutter,
    toggleLeft,
    toggleRight,
    setLeftGutterWidth,
    setRightGutterWidth,
  };
}

export type UseHeaderDrawerReturn = ReturnType<typeof useHeaderDrawer>;
