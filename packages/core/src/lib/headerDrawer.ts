/**
 * FORGE Header Drawer — Data Model & Persistence
 *
 * When a user types a markdown header and presses enter, a configurable
 * metadata drawer blooms open with slots. Filled values persist and
 * migrate to the left gutter after collapse.
 *
 * Hierarchy: headers inherit metadata from parent headers.
 * Tags merge; Classification inherits unless overridden;
 * Data Binding and Notes do NOT inherit.
 */

// ─── Slot Field Types ────────────────────────────────────────

export type SlotFieldType =
  | 'tags'           // chip input (type + enter = pill)
  | 'dropdown'       // single-select dropdown
  | 'data-binding'   // dropdown (Postgres table/view/query/none)
  | 'text'           // free text
  | 'number'         // numeric input
  | 'boolean'        // yes/no toggle
  | 'url'            // URL input
  | 'computed';      // read-only computed value

export interface SlotDefinition {
  label: string;
  fieldType: SlotFieldType;
  /** For dropdowns: available options */
  options?: string[];
  /** Whether this slot's value inherits from parent headers */
  inherits: boolean;
}

export interface SlotValue {
  slotIndex: number;
  label: string;
  fieldType: SlotFieldType;
  value: string | string[] | number | boolean | null;
  /** Whether this value was inherited from a parent header */
  inherited: boolean;
  /** If inherited, the source section ID */
  inheritedFrom?: string;
}

// ─── Section Metadata ────────────────────────────────────────

export interface SectionMeta {
  /** Unique ID for this section (derived from grid nodeId) */
  sectionId: string;
  /** Header level (1-6) */
  level: number;
  /** Header text content */
  title: string;
  /** Parent section ID (nearest parent header) */
  parentSectionId: string | null;
  /** Filled slot values */
  slots: SlotValue[];
  /** Whether the drawer is currently open */
  drawerOpen: boolean;
  /** Grid row index this section maps to */
  gridRowIndex: number;
}

// ─── Default Slot Definitions ────────────────────────────────

export const DEFAULT_SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    label: 'Tags',
    fieldType: 'tags',
    inherits: true,  // Tags merge: child adds to parent's set
  },
  {
    label: 'Classification',
    fieldType: 'dropdown',
    options: [
      'TP', 'DT', 'EX', 'HI', 'PH', 'CH', 'BI', 'PS', 'SO', 'EN',
      'EVENT', 'PROGRAM', 'INSTITUTION', 'PROPAGANDA', 'PROPHETIC',
      'PHENOMENON', 'PATTERN', 'SYMBOL', 'CULTURAL',
    ],
    inherits: true,  // Inherit unless overridden
  },
  {
    label: 'Data Binding',
    fieldType: 'data-binding',
    options: ['none', 'table', 'view', 'query'],
    inherits: false, // Each section binds its own source
  },
  {
    label: 'Notes',
    fieldType: 'text',
    inherits: false, // Notes are per-section
  },
];

// ─── State Management ────────────────────────────────────────

export interface HeaderDrawerState {
  /** All section metadata, keyed by sectionId */
  sections: Record<string, SectionMeta>;
  /** Slot definitions (can be overridden by template) */
  slotDefinitions: SlotDefinition[];
  /** Max number of slots */
  maxSlots: number;
  /** Whether "Expand All" is active */
  expandAll: boolean;
  /** Gutter collapse state */
  gutterState: 'full' | 'left' | 'right' | 'prose';
  /** Left gutter width in px */
  leftGutterWidth: number;
  /** Right gutter width in px */
  rightGutterWidth: number;
}

export function createDefaultDrawerState(): HeaderDrawerState {
  return {
    sections: {},
    slotDefinitions: DEFAULT_SLOT_DEFINITIONS,
    maxSlots: 4,
    expandAll: false,
    gutterState: 'full',
    leftGutterWidth: 180,
    rightGutterWidth: 200,
  };
}

// ─── Slot Value Helpers ──────────────────────────────────────

export function createEmptySlotValue(def: SlotDefinition, index: number): SlotValue {
  return {
    slotIndex: index,
    label: def.label,
    fieldType: def.fieldType,
    value: def.fieldType === 'tags' ? [] : null,
    inherited: false,
  };
}

export function isSlotFilled(slot: SlotValue): boolean {
  if (slot.value === null || slot.value === '') return false;
  if (Array.isArray(slot.value) && slot.value.length === 0) return false;
  return true;
}

// ─── Inheritance Logic ───────────────────────────────────────

/**
 * Resolve inherited values for a section by walking the parent chain.
 * Tags merge (child adds to parent set). Other inheritable fields
 * inherit unless overridden.
 */
export function resolveInheritedValues(
  sectionId: string,
  state: HeaderDrawerState,
): SlotValue[] {
  const section = state.sections[sectionId];
  if (!section) return state.slotDefinitions.map((d, i) => createEmptySlotValue(d, i));

  const ownSlots = [...section.slots];
  if (!section.parentSectionId) return ownSlots;

  // Walk parent chain
  const parentValues = resolveInheritedValues(section.parentSectionId, state);

  return ownSlots.map((slot, i) => {
    const def = state.slotDefinitions[i];
    if (!def || !def.inherits) return slot;

    const parentSlot = parentValues[i];
    if (!parentSlot) return slot;

    // Tags: merge parent + own
    if (def.fieldType === 'tags') {
      const parentTags = Array.isArray(parentSlot.value) ? parentSlot.value : [];
      const ownTags = Array.isArray(slot.value) ? slot.value : [];
      if (ownTags.length === 0 && parentTags.length === 0) return slot;
      const merged = [...new Set([...parentTags, ...ownTags])];
      return {
        ...slot,
        value: merged,
        inherited: ownTags.length === 0 && parentTags.length > 0,
        inheritedFrom: ownTags.length === 0 ? (parentSlot.inheritedFrom || section.parentSectionId!) : undefined,
      };
    }

    // Other inheritable fields: inherit if own value is null/empty
    if (!isSlotFilled(slot) && isSlotFilled(parentSlot)) {
      return {
        ...slot,
        value: parentSlot.value,
        inherited: true,
        inheritedFrom: parentSlot.inheritedFrom || section.parentSectionId!,
      };
    }

    return slot;
  });
}

// ─── Section CRUD ────────────────────────────────────────────

export function upsertSection(
  state: HeaderDrawerState,
  sectionId: string,
  level: number,
  title: string,
  parentSectionId: string | null,
  gridRowIndex: number,
): HeaderDrawerState {
  const existing = state.sections[sectionId];
  if (existing) {
    return {
      ...state,
      sections: {
        ...state.sections,
        [sectionId]: {
          ...existing,
          level,
          title,
          parentSectionId,
          gridRowIndex,
        },
      },
    };
  }

  const slots = state.slotDefinitions.map((def, i) => createEmptySlotValue(def, i));

  return {
    ...state,
    sections: {
      ...state.sections,
      [sectionId]: {
        sectionId,
        level,
        title,
        parentSectionId,
        slots,
        drawerOpen: false,
        gridRowIndex,
      },
    },
  };
}

export function updateSlotValue(
  state: HeaderDrawerState,
  sectionId: string,
  slotIndex: number,
  value: string | string[] | number | boolean | null,
): HeaderDrawerState {
  const section = state.sections[sectionId];
  if (!section) return state;

  const newSlots = section.slots.map((s, i) => {
    if (i !== slotIndex) return s;
    return { ...s, value, inherited: false, inheritedFrom: undefined };
  });

  return {
    ...state,
    sections: {
      ...state.sections,
      [sectionId]: { ...section, slots: newSlots },
    },
  };
}

export function toggleDrawer(
  state: HeaderDrawerState,
  sectionId: string,
  open?: boolean,
): HeaderDrawerState {
  const section = state.sections[sectionId];
  if (!section) return state;

  return {
    ...state,
    sections: {
      ...state.sections,
      [sectionId]: {
        ...section,
        drawerOpen: open !== undefined ? open : !section.drawerOpen,
      },
    },
  };
}

export function toggleExpandAll(state: HeaderDrawerState): HeaderDrawerState {
  const newExpandAll = !state.expandAll;
  const newSections = { ...state.sections };
  for (const id of Object.keys(newSections)) {
    newSections[id] = { ...newSections[id], drawerOpen: newExpandAll };
  }
  return { ...state, sections: newSections, expandAll: newExpandAll };
}

// ─── Gutter State ────────────────────────────────────────────

export type GutterState = 'full' | 'left' | 'right' | 'prose';

export function cycleGutterState(current: GutterState): GutterState {
  const cycle: GutterState[] = ['full', 'left', 'right', 'prose'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

export function toggleLeftGutter(current: GutterState): GutterState {
  switch (current) {
    case 'full': return 'right';
    case 'left': return 'prose';
    case 'right': return 'full';
    case 'prose': return 'left';
  }
}

export function toggleRightGutter(current: GutterState): GutterState {
  switch (current) {
    case 'full': return 'left';
    case 'right': return 'prose';
    case 'left': return 'full';
    case 'prose': return 'right';
  }
}

// ─── Persistence ─────────────────────────────────────────────

const STORAGE_KEY = 'forge.headerDrawer.v1';

function getDocKey(documentId: string) {
  return `${STORAGE_KEY}:${documentId}`;
}

export function saveDrawerState(documentId: string, state: HeaderDrawerState): void {
  const serializable = {
    sections: state.sections,
    maxSlots: state.maxSlots,
    expandAll: state.expandAll,
    gutterState: state.gutterState,
    leftGutterWidth: state.leftGutterWidth,
    rightGutterWidth: state.rightGutterWidth,
  };
  localStorage.setItem(getDocKey(documentId), JSON.stringify(serializable));
}

export function loadDrawerState(documentId: string): Partial<HeaderDrawerState> | null {
  try {
    const raw = localStorage.getItem(getDocKey(documentId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
