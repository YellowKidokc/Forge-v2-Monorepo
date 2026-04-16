/**
 * FORGE Annotation Engine Types
 *
 * Annotations are hidden layers beneath clean text.
 * Think: Bible commentary markers, Jupyter hidden cells, Notion toggles.
 * Each annotation point can expand to reveal a 6-slot configurable dashboard.
 */

/** Where an annotation anchors in the document */
export interface AnnotationAnchor {
  /** Line-level anchoring (primary mode) */
  lineNumber: number;
  /** Optional: character range within the line for inline (Bible verse) mode */
  from?: number;
  to?: number;
  /** Stable text snippet for re-anchoring after edits */
  anchorText: string;
  /** Granularity */
  grain: 'word' | 'phrase' | 'line' | 'block' | 'document';
}

/** Content types that can live in annotation slots */
export type SlotContentType =
  | 'commentary'       // Written commentary / analysis
  | 'definition'       // Word/term definitions
  | 'ai-chat'          // AI conversation layer
  | 'concordance'      // Reference data (Strong's, lexicons, etc.)
  | 'calculation'      // Math, formulas, computed values
  | 'evidence'         // Evidence chains, citations
  | 'metadata'         // Key-value metadata
  | 'links'            // Cross-references, wiki links
  | 'custom';          // User-defined via AI plugins

/** A single slot in the 6-slot annotation grid */
export interface AnnotationSlot {
  id: string;
  /** Position in the grid: 1-6 (1-3 left column, 4-6 right column) */
  position: number;
  /** If merged with adjacent slot, which slots are combined */
  mergedWith: number[];
  /** What type of content this slot holds */
  contentType: SlotContentType;
  /** Display label */
  label: string;
  /** The actual content — markdown string, can be 2 lines or 200 pages */
  body: string;
  /** Structured data for concordance/calculation types */
  data?: Record<string, unknown>;
  /** Source reference if data was imported */
  source?: string;
  /** Whether this slot is collapsed in the UI */
  collapsed: boolean;
}

/** A single annotation point on a line */
export interface Annotation {
  id: string;
  documentId: string;
  anchor: AnnotationAnchor;
  /** The 6-slot grid for this annotation */
  slots: AnnotationSlot[];
  /** Which layer this annotation belongs to */
  layerId: string;
  /** Visual marker style */
  markerStyle: MarkerStyle;
  /** Nesting: parent annotation if this is nested */
  parentId: string | null;
  childIds: string[];
  /** Grid address for grid-layer integration */
  gridAddress?: { row: number; col: number };
  /** Timestamps */
  createdAt: number;
  updatedAt: number;
}

/** How the marker appears on the line */
export type MarkerStyle = 'chevron' | 'superscript' | 'dot' | 'faint' | 'underline' | 'none';

/** A visibility layer — users configure up to 6 */
export interface AnnotationLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  markerStyle: MarkerStyle;
  /** Default slot layout when creating annotations in this layer */
  defaultSlotLayout: SlotLayoutPreset;
  order: number;
}

/** Preset layouts for the 6-slot grid */
export type SlotLayoutPreset =
  | '3-3'       // 3 left, 3 right (default)
  | '2-4'       // 2 left, 4 right
  | '1-5'       // 1 left, 5 right
  | '6-full'    // all 6 as single column
  | 'custom';   // user-defined merges

/** Overall layer configuration */
export interface LayerConfig {
  layers: AnnotationLayer[];
  /** Master opacity for all annotation markers (0-1) */
  markerOpacity: number;
  /** Default marker style for new annotations */
  defaultMarkerStyle: MarkerStyle;
  /** Default layout preset */
  defaultLayout: SlotLayoutPreset;
}

/** Result of a data import */
export interface ImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
  layerId: string;
}

/** Helper: create a default 6-slot layout */
export function createDefaultSlots(layout: SlotLayoutPreset = '3-3'): AnnotationSlot[] {
  const slots: AnnotationSlot[] = [];
  for (let i = 1; i <= 6; i++) {
    slots.push({
      id: `slot-${i}`,
      position: i,
      mergedWith: [],
      contentType: 'commentary',
      label: `Slot ${i}`,
      body: '',
      collapsed: true,
    });
  }
  // Apply merge presets
  if (layout === '2-4') {
    // merge right side slots 3-6
    slots[2].mergedWith = [4, 5, 6];
  }
  return slots;
}

/** Helper: create default layer config */
export function createDefaultLayerConfig(): LayerConfig {
  return {
    layers: [
      { id: 'commentary', name: 'Commentary', color: '#f59e0b', visible: true, markerStyle: 'chevron', defaultSlotLayout: '3-3', order: 0 },
      { id: 'definitions', name: 'Definitions', color: '#3b82f6', visible: true, markerStyle: 'dot', defaultSlotLayout: '3-3', order: 1 },
      { id: 'ai', name: 'AI Analysis', color: '#8b5cf6', visible: true, markerStyle: 'faint', defaultSlotLayout: '3-3', order: 2 },
      { id: 'concordance', name: 'Concordance', color: '#10b981', visible: false, markerStyle: 'superscript', defaultSlotLayout: '3-3', order: 3 },
      { id: 'calculations', name: 'Calculations', color: '#ef4444', visible: false, markerStyle: 'none', defaultSlotLayout: '3-3', order: 4 },
      { id: 'evidence', name: 'Evidence', color: '#ec4899', visible: false, markerStyle: 'underline', defaultSlotLayout: '3-3', order: 5 },
    ],
    markerOpacity: 0.7,
    defaultMarkerStyle: 'chevron',
    defaultLayout: '3-3',
  };
}
