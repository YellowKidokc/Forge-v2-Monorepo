/**
 * FORGE Template System
 *
 * A template is a YAML definition that specifies which fields appear
 * in the left gutter, which annotation layers activate, which rules
 * auto-attach, and how the section renders.
 *
 * One template = one section type = one entry in the "Turn into..." menu.
 */

import type { SlotFieldType } from './headerDrawer';

// ─── Template Types ──────────────────────────────────────────

export interface TemplateFieldDef {
  name: string;
  type: SlotFieldType;
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
  computed?: boolean;
  engine?: string;
  min?: number;
  max?: number;
}

export interface DrawerSlotDef {
  slot: number;
  label: string;
  type: 'chips' | 'dropdown' | 'freetext' | 'url' | 'number' | 'boolean' | 'passage' | 'reference';
  field?: string; // links to a TemplateFieldDef.name
}

export interface TemplateRuleDef {
  column: string;
  action: string;
  fires_on: 'insert' | 'update' | 'delete';
  config?: Record<string, unknown>;
}

export interface TemplateRenderConfig {
  obsidian?: {
    frontmatter?: string[];
    inline_fields?: string[];
  };
  notion?: {
    properties?: string[];
    linked_db?: boolean;
  };
  html?: {
    card_layout?: boolean;
    card_fields?: string[];
  };
}

export interface ForgeTemplate {
  template_id: string;
  name: string;
  section_type: string;
  version: number;
  fields: TemplateFieldDef[];
  annotation_layers?: string[];
  default_rules?: TemplateRuleDef[];
  drawer_slots?: DrawerSlotDef[];
  render?: TemplateRenderConfig;
}

// ─── Built-in Templates ──────────────────────────────────────

export const BUILTIN_TEMPLATES: ForgeTemplate[] = [
  {
    template_id: 'tpl_prose',
    name: 'Prose (default)',
    section_type: 'prose',
    version: 1,
    fields: [
      { name: 'tags', type: 'tags' },
      { name: 'notes', type: 'text' },
    ],
    annotation_layers: ['Commentary', 'Definitions'],
    drawer_slots: [
      { slot: 1, label: 'Tags', type: 'chips', field: 'tags' },
      { slot: 2, label: 'Notes', type: 'freetext', field: 'notes' },
    ],
  },
  {
    template_id: 'tpl_case_brief',
    name: 'Case Brief',
    section_type: 'case_brief',
    version: 1,
    fields: [
      { name: 'category', type: 'dropdown', options: ['EVENT', 'PROGRAM', 'INSTITUTION', 'PROPAGANDA', 'PROPHETIC', 'PHENOMENON', 'PATTERN', 'SYMBOL', 'CULTURAL'], required: true, default: 'EVENT' },
      { name: 'evidence_tier', type: 'dropdown', options: ['T1', 'T2', 'T3', 'T4', 'T5'] },
      { name: 'ocs_score', type: 'number', computed: true, engine: 'ocs_calculator' },
      { name: 'source_url', type: 'url' },
      { name: 'status', type: 'dropdown', options: ['Active', 'Closed', 'Disputed', 'Debunked'], default: 'Active' },
      { name: 'confidence', type: 'number', min: 0, max: 100 },
    ],
    annotation_layers: ['Evidence', 'AI Analysis', 'Commentary'],
    default_rules: [
      { column: 'source_url', action: 'scrape', fires_on: 'insert' },
      { column: 'category', action: 'tag', fires_on: 'insert', config: { tag_prefix: 'case:' } },
    ],
    drawer_slots: [
      { slot: 1, label: 'Tags', type: 'chips' },
      { slot: 2, label: 'Category', type: 'dropdown', field: 'category' },
      { slot: 3, label: 'Source', type: 'url', field: 'source_url' },
      { slot: 4, label: 'Notes', type: 'freetext' },
    ],
  },
  {
    template_id: 'tpl_article',
    name: 'Article',
    section_type: 'article',
    version: 1,
    fields: [
      { name: 'series', type: 'text' },
      { name: 'article_number', type: 'number' },
      { name: 'status', type: 'dropdown', options: ['Draft', 'Review', 'Published', 'Archived'], default: 'Draft' },
    ],
    annotation_layers: ['Commentary', 'AI Analysis'],
    drawer_slots: [
      { slot: 1, label: 'Tags', type: 'chips' },
      { slot: 2, label: 'Series', type: 'freetext', field: 'series' },
      { slot: 3, label: 'Status', type: 'dropdown', field: 'status' },
      { slot: 4, label: 'Notes', type: 'freetext' },
    ],
  },
  {
    template_id: 'tpl_person',
    name: 'Person Profile',
    section_type: 'person',
    version: 1,
    fields: [
      { name: 'aliases', type: 'tags' },
      { name: 'affiliations', type: 'tags' },
      { name: 'credibility_score', type: 'number', min: 0, max: 100 },
    ],
    annotation_layers: ['Evidence', 'Commentary'],
    drawer_slots: [
      { slot: 1, label: 'Aliases', type: 'chips', field: 'aliases' },
      { slot: 2, label: 'Affiliations', type: 'chips', field: 'affiliations' },
      { slot: 3, label: 'Credibility', type: 'number', field: 'credibility_score' },
      { slot: 4, label: 'Notes', type: 'freetext' },
    ],
  },
  {
    template_id: 'tpl_investment',
    name: 'Investment Memo',
    section_type: 'investment',
    version: 1,
    fields: [
      { name: 'ticker', type: 'text' },
      { name: 'sector', type: 'dropdown', options: ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Real Estate', 'Utilities'] },
      { name: 'valuation', type: 'text' },
      { name: 'risk_factors', type: 'tags' },
    ],
    annotation_layers: ['Calculations', 'Commentary'],
    drawer_slots: [
      { slot: 1, label: 'Ticker', type: 'freetext', field: 'ticker' },
      { slot: 2, label: 'Sector', type: 'dropdown', field: 'sector' },
      { slot: 3, label: 'Risk', type: 'chips', field: 'risk_factors' },
      { slot: 4, label: 'Notes', type: 'freetext' },
    ],
  },
  {
    template_id: 'tpl_bible_study',
    name: 'Bible Study',
    section_type: 'bible_study',
    version: 1,
    fields: [
      { name: 'passage', type: 'text' },
      { name: 'strongs_number', type: 'text' },
      { name: 'cross_refs', type: 'tags' },
      { name: 'theological_claim', type: 'text' },
    ],
    annotation_layers: ['Concordance', 'Definitions', 'Commentary'],
    drawer_slots: [
      { slot: 1, label: 'Passage', type: 'freetext', field: 'passage' },
      { slot: 2, label: "Strong's", type: 'freetext', field: 'strongs_number' },
      { slot: 3, label: 'Cross Refs', type: 'chips', field: 'cross_refs' },
      { slot: 4, label: 'Claim', type: 'freetext', field: 'theological_claim' },
    ],
  },
  {
    template_id: 'tpl_axiom',
    name: 'Axiom Page',
    section_type: 'axiom',
    version: 1,
    fields: [
      { name: 'axiom_id', type: 'text' },
      { name: 'depends_on', type: 'tags' },
      { name: 'formal_statement', type: 'text' },
      { name: 'status', type: 'dropdown', options: ['Proposed', 'Proven', 'Challenged', 'Refuted'], default: 'Proposed' },
    ],
    annotation_layers: ['Calculations', 'Evidence', 'AI Analysis'],
    drawer_slots: [
      { slot: 1, label: 'Axiom ID', type: 'freetext', field: 'axiom_id' },
      { slot: 2, label: 'Depends On', type: 'chips', field: 'depends_on' },
      { slot: 3, label: 'Status', type: 'dropdown', field: 'status' },
      { slot: 4, label: 'Statement', type: 'freetext', field: 'formal_statement' },
    ],
  },
];

// ─── Template Registry ───────────────────────────────────────

export interface TemplateRegistry {
  templates: ForgeTemplate[];
  byId: Map<string, ForgeTemplate>;
  byType: Map<string, ForgeTemplate>;
}

export function createTemplateRegistry(custom: ForgeTemplate[] = []): TemplateRegistry {
  const all = [...BUILTIN_TEMPLATES, ...custom];
  const byId = new Map<string, ForgeTemplate>();
  const byType = new Map<string, ForgeTemplate>();

  for (const t of all) {
    byId.set(t.template_id, t);
    byType.set(t.section_type, t);
  }

  return { templates: all, byId, byType };
}

// ─── YAML Parsing (lightweight) ──────────────────────────────
// A minimal YAML-like parser for template files.
// For full YAML support, users would add a proper YAML library.

export function parseTemplateYaml(yamlText: string): ForgeTemplate | null {
  try {
    const lines = yamlText.split('\n');
    const result: Record<string, any> = {};
    let currentKey = '';
    let currentList: any[] | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith('#')) continue;

      // Top-level key: value
      const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
      if (kvMatch) {
        if (currentList && currentKey) {
          result[currentKey] = currentList;
        }
        currentKey = kvMatch[1];
        const val = kvMatch[2].trim();
        if (val === '' || val === '|') {
          currentList = [];
        } else {
          currentList = null;
          // Parse inline array [a, b, c]
          if (val.startsWith('[') && val.endsWith(']')) {
            result[currentKey] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          } else {
            result[currentKey] = val.replace(/^['"]|['"]$/g, '');
          }
        }
        continue;
      }

      // List item
      if (line.match(/^\s+-\s/) && currentKey) {
        if (!currentList) currentList = [];
        const itemContent = line.replace(/^\s+-\s*/, '').trim();

        // Object-style list item { key: val, key: val }
        if (itemContent.startsWith('{') && itemContent.endsWith('}')) {
          const obj: Record<string, any> = {};
          const inner = itemContent.slice(1, -1);
          for (const pair of inner.split(',')) {
            const [k, ...rest] = pair.split(':');
            if (k) obj[k.trim()] = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
          }
          currentList.push(obj);
        } else {
          // Key-value sub-item
          const subKv = itemContent.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
          if (subKv) {
            const last = currentList[currentList.length - 1];
            if (last && typeof last === 'object') {
              const subVal = subKv[2].trim();
              if (subVal.startsWith('[') && subVal.endsWith(']')) {
                last[subKv[1]] = subVal.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''));
              } else {
                last[subKv[1]] = subVal.replace(/^['"]|['"]$/g, '');
              }
            } else {
              currentList.push({ [subKv[1]]: subKv[2].trim().replace(/^['"]|['"]$/g, '') });
            }
          } else {
            currentList.push(itemContent.replace(/^['"]|['"]$/g, ''));
          }
        }
      }
    }

    if (currentList && currentKey) {
      result[currentKey] = currentList;
    }

    if (!result.template_id || !result.name || !result.section_type) {
      return null;
    }

    return {
      template_id: result.template_id,
      name: result.name,
      section_type: result.section_type,
      version: Number(result.version) || 1,
      fields: Array.isArray(result.fields) ? result.fields : [],
      annotation_layers: Array.isArray(result.annotation_layers) ? result.annotation_layers : undefined,
      default_rules: Array.isArray(result.default_rules) ? result.default_rules : undefined,
      drawer_slots: Array.isArray(result.drawer_slots) ? result.drawer_slots : undefined,
      render: result.render || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Template Conversion Helpers ─────────────────────────────

/**
 * Convert a template's field definitions to SlotDefinitions
 * for use with the header drawer system.
 */
export function templateToSlotDefinitions(template: ForgeTemplate) {
  if (template.drawer_slots && template.drawer_slots.length > 0) {
    return template.drawer_slots.map(ds => ({
      label: ds.label,
      fieldType: mapDrawerSlotType(ds.type),
      options: ds.field
        ? template.fields.find(f => f.name === ds.field)?.options
        : undefined,
      inherits: ds.type === 'chips', // tags inherit, others don't by default
    }));
  }

  // Fall back to field definitions
  return template.fields.slice(0, 4).map(f => ({
    label: f.name,
    fieldType: f.type,
    options: f.options,
    inherits: f.type === 'tags',
  }));
}

function mapDrawerSlotType(type: string): import('./headerDrawer').SlotFieldType {
  switch (type) {
    case 'chips': return 'tags';
    case 'freetext': return 'text';
    case 'passage': return 'text';
    case 'reference': return 'text';
    default: return type as import('./headerDrawer').SlotFieldType;
  }
}
