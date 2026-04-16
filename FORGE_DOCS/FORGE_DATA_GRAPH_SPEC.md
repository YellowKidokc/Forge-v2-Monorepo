# FORGE — Data Graph Spec

**Status:** Draft 1 — ready for Codex
**Author:** Opus session, April 15, 2026
**Companion doc:** FORGE_LAYER_3_RULE_SUBSTRATE_SPEC.md (depends on this schema)
**Connects to:** FIS (`file-intelligence-system`) via shared `files` table

---

## 1. Purpose

Every addressable thing in Forge gets a stable ID in Postgres. Documents, sections, primitives, cells, rows, rules, mirror entries, engines, and rule firings — all queryable, all cross-referenceable. Without this, the Rule Substrate (Layer 3) has nothing to address and the AI Partners have nothing to query.

This spec defines the **ID taxonomy**, the **Postgres schema**, and the **integration point where FIS feeds into Forge**.

---

## 2. ID taxonomy — what gets an ID

Every entity below gets a ULID (Universally Unique Lexicographically Sortable Identifier). ULIDs over UUIDs because they sort by creation time, which matters for rule firing order and telemetry queries.

```
ENTITY              ID FIELD          WHAT IT IS
──────────────────────��─────────────────────────────────────────
files               file_id           FIS-classified source file (EXISTING — from FIS)
documents           doc_id            A Forge document (top-layer prose + embedded primitives)
sections            section_id        A contiguous block of prose between primitives
primitives          prim_id           An inline element: link, dropdown, field, embed
grid_rows           row_id            A row in the Excel layer under a document
grid_cells          cell_id           A single cell in a row (one column, one value)
rules               rule_id           A standing rule in _rules/ (see RULE_SUBSTRATE_SPEC)
mirror_entries      mirror_id         A scrape, enrichment, or AI note in the mirror folder
rule_firings        firing_id         A single execution of a rule against a cell
engines             engine_id         A YAML engine in _engines/
annotations         annotation_id     A note attached to a cell/row/primitive (AI or user)
```

---

## 3. Postgres schema

### 3a. Core content tables

```sql
-- Documents: the top-layer prose container
CREATE TABLE documents (
    doc_id          TEXT PRIMARY KEY,              -- ULID
    title           TEXT NOT NULL,
    source_file_id  TEXT REFERENCES files(file_id), -- links to FIS
    vault_path      TEXT,                          -- relative path in vault
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sections: contiguous prose blocks between primitives
CREATE TABLE sections (
    section_id      TEXT PRIMARY KEY,              -- ULID
    doc_id          TEXT REFERENCES documents(doc_id) ON DELETE CASCADE,
    position        INT NOT NULL,                  -- order within document
    section_type    TEXT DEFAULT 'prose',          -- prose | axiom | case_brief | person | book | investment | bible_study | custom (see HEADER_DRAWER_AND_GUTTER_SPEC)
    content_md      TEXT,                          -- markdown text
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Primitives: inline elements (links, dropdowns, fields, embeds)
CREATE TABLE primitives (
    prim_id         TEXT PRIMARY KEY,              -- ULID
    doc_id          TEXT REFERENCES documents(doc_id) ON DELETE CASCADE,
    section_id      TEXT REFERENCES sections(section_id),
    type            TEXT NOT NULL,                 -- link | dropdown | field | embed | boolean
    position        INT NOT NULL,                  -- order within section
    grid_cell_id    TEXT,                          -- resolves to the Excel cell backing this primitive
    display_label   TEXT,                          -- what the user sees inline ("Height", "Source URL")
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3b. Grid layer tables (the "Excel underneath")

```sql
-- Grid schemas: defines columns for a document's grid
CREATE TABLE grid_schemas (
    schema_id       TEXT PRIMARY KEY,              -- ULID
    doc_id          TEXT REFERENCES documents(doc_id) ON DELETE CASCADE,
    columns         JSONB NOT NULL,                -- [{name: "height", type: "dropdown", options: [...]}, ...]
    display_resolution TEXT DEFAULT 'word',        -- word | char | full (see GRID_RESOLUTION_SPEC)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Grid rows: one row per logical entry in the Excel layer
CREATE TABLE grid_rows (
    row_id          TEXT PRIMARY KEY,              -- ULID
    doc_id          TEXT REFERENCES documents(doc_id) ON DELETE CASCADE,
    schema_id       TEXT REFERENCES grid_schemas(schema_id),
    position        INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Grid cells: one per column per row
CREATE TABLE grid_cells (
    cell_id         TEXT PRIMARY KEY,              -- ULID
    row_id          TEXT REFERENCES grid_rows(row_id) ON DELETE CASCADE,
    field_name      TEXT NOT NULL,                 -- column name from schema
    value           TEXT,                          -- stored as text, typed by schema
    value_type      TEXT DEFAULT 'text',           -- text | number | boolean | url | dropdown
    resolution      TEXT DEFAULT 'word',           -- word | char | full (see GRID_RESOLUTION_SPEC)
    last_rule_id    TEXT,                          -- which rule last wrote this cell (nullable)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index: look up cells by field name across all documents
CREATE INDEX idx_cells_field ON grid_cells(field_name);
-- Index: find all cells written by a specific rule
CREATE INDEX idx_cells_last_rule ON grid_cells(last_rule_id);
```

### 3c. Rule tables

```sql
-- Rules: standing instructions (YAML also lives in _rules/ folder)
CREATE TABLE rules (
    rule_id         TEXT PRIMARY KEY,              -- ULID, matches YAML filename
    name            TEXT NOT NULL,
    target_column   TEXT,                          -- which grid column this watches
    pattern_type    TEXT NOT NULL,                 -- exact | domain | prefix | regex | contains | any
    pattern         TEXT,                          -- the match value (null for 'any')
    action_type     TEXT NOT NULL,                 -- mirror_write | redirect | scrape | tag | notify | chain | engine_call
    action_config   JSONB NOT NULL,                -- action-specific parameters
    fires_on        TEXT DEFAULT 'insert',         -- insert | update | save | render | manual
    execution_order INT DEFAULT 0,                 -- for stacked rules
    stacked_with    TEXT[],                        -- rule_ids that fire together
    active          BOOLEAN DEFAULT TRUE,
    created_by      TEXT DEFAULT 'user',           -- user | ai_connector | ai_challenger | ai_archivist
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_column ON rules(target_column);
CREATE INDEX idx_rules_active ON rules(active);
```

### 3d. Mirror and telemetry tables

```sql
-- Mirror entries: enrichments, scrapes, AI notes (the "back side")
CREATE TABLE mirror_entries (
    mirror_id           TEXT PRIMARY KEY,          -- ULID
    trigger_prim_id     TEXT REFERENCES primitives(prim_id),
    trigger_cell_id     TEXT REFERENCES grid_cells(cell_id),
    trigger_rule_id     TEXT REFERENCES rules(rule_id),
    kind                TEXT NOT NULL,             -- scrape | summary | tag | redirect_log | ai_note
    payload             JSONB NOT NULL,            -- the actual content
    source_url          TEXT,                      -- for scrapes
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mirror_rule ON mirror_entries(trigger_rule_id);
CREATE INDEX idx_mirror_prim ON mirror_entries(trigger_prim_id);
CREATE INDEX idx_mirror_kind ON mirror_entries(kind);

-- Rule firings: append-only audit log
CREATE TABLE rule_firings (
    firing_id       TEXT PRIMARY KEY,              -- ULID
    rule_id         TEXT REFERENCES rules(rule_id),
    target_cell_id  TEXT REFERENCES grid_cells(cell_id),
    input_value     TEXT,                          -- what the cell contained when the rule fired
    success         BOOLEAN NOT NULL,
    error_message   TEXT,                          -- null on success
    output_mirror_id TEXT REFERENCES mirror_entries(mirror_id),
    fired_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_firings_rule ON rule_firings(rule_id);
CREATE INDEX idx_firings_cell ON rule_firings(target_cell_id);
CREATE INDEX idx_firings_time ON rule_firings(fired_at);

-- Annotations: notes attached by user or AI to any addressable entity
CREATE TABLE annotations (
    annotation_id   TEXT PRIMARY KEY,              -- ULID
    target_type     TEXT NOT NULL,                 -- document | section | primitive | cell | row
    target_id       TEXT NOT NULL,                 -- the ULID of the target entity
    author          TEXT NOT NULL,                 -- user | opus | connector | challenger | archivist
    content         TEXT NOT NULL,
    layer           TEXT,                          -- maps to annotation engine layer name
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_target ON annotations(target_type, target_id);
CREATE INDEX idx_annotations_author ON annotations(author);
```

### 3e. Engine registry

```sql
-- Engines: registered YAML engines and renderers
CREATE TABLE engines (
    engine_id       TEXT PRIMARY KEY,              -- ULID
    name            TEXT NOT NULL,
    engine_type     TEXT NOT NULL,                 -- engine | renderer | action
    yaml_path       TEXT NOT NULL,                 -- relative path in _engines/
    active          BOOLEAN DEFAULT TRUE,
    last_invoked    TIMESTAMPTZ,
    invoke_count    INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. FIS integration — connecting file classification to document graph

FIS already has a `files` table with `file_id`, `sequence_id`, `domain`, `subject_codes`, `slug`, `sha256`, `status`, `confidence`, etc.

**The bridge:** `documents.source_file_id` → `files.file_id`.

When FIS classifies a file and Forge opens it as a document:
1. Forge checks if `documents` has a row for this `file_id`.
2. If not, Forge creates a `documents` row with `source_file_id = file_id`.
3. All FIS metadata (domain, subjects, tags, confidence) is accessible through the join.

**Query example — "show me all Theophysics documents with links that haven't been scraped":**
```sql
SELECT d.title, p.display_label, gc.value
FROM documents d
JOIN files f ON d.source_file_id = f.file_id
JOIN primitives p ON p.doc_id = d.doc_id AND p.type = 'link'
JOIN grid_cells gc ON gc.cell_id = p.grid_cell_id
LEFT JOIN mirror_entries me ON me.trigger_cell_id = gc.cell_id AND me.kind = 'scrape'
WHERE f.domain = 'TP'
  AND me.mirror_id IS NULL;
```

**Schema assumption:** FIS and Forge share the same Postgres instance (192.168.1.177:2665). If that changes (e.g., Forge moves to a cloud Postgres), the bridge becomes an API call instead of a JOIN. But for v1, same instance, same database or cross-database reference.

---

## 5. Query patterns — what the AI Partners actually ask

These are the queries that Connector / Challenger / Archivist run. Each is a SQL query wrapped in a prompt that interprets the results.

### Connector — finds bridges
```sql
-- Cells with identical values across different documents
SELECT gc.value, array_agg(DISTINCT d.doc_id) AS docs, COUNT(DISTINCT d.doc_id) AS doc_count
FROM grid_cells gc
JOIN grid_rows gr ON gc.row_id = gr.row_id
JOIN documents d ON gr.doc_id = d.doc_id
GROUP BY gc.value
HAVING COUNT(DISTINCT d.doc_id) > 1
ORDER BY doc_count DESC
LIMIT 50;
```

### Challenger — finds contradictions
```sql
-- Rules that failed more than 3 times on the same cell
SELECT r.name, r.rule_id, rf.target_cell_id, COUNT(*) AS fail_count
FROM rule_firings rf
JOIN rules r ON rf.rule_id = r.rule_id
WHERE rf.success = FALSE
GROUP BY r.name, r.rule_id, rf.target_cell_id
HAVING COUNT(*) > 3;

-- Cells with contradicting rule outputs (two redirect rules, different values)
SELECT gc.cell_id, array_agg(r.rule_id) AS conflicting_rules
FROM grid_cells gc
JOIN rules r ON r.target_column = gc.field_name AND r.action_type = 'redirect'
WHERE r.active = TRUE
GROUP BY gc.cell_id
HAVING COUNT(*) > 1;
```

### Archivist — finds gaps
```sql
-- Primitives with no rules attached
SELECT p.prim_id, p.type, p.display_label, d.title
FROM primitives p
JOIN documents d ON p.doc_id = d.doc_id
LEFT JOIN grid_cells gc ON gc.cell_id = p.grid_cell_id
LEFT JOIN rules r ON r.target_column = gc.field_name
WHERE r.rule_id IS NULL;

-- Rules that haven't fired in 30 days
SELECT r.rule_id, r.name, MAX(rf.fired_at) AS last_fired
FROM rules r
LEFT JOIN rule_firings rf ON r.rule_id = rf.rule_id
WHERE r.active = TRUE
GROUP BY r.rule_id, r.name
HAVING MAX(rf.fired_at) < NOW() - INTERVAL '30 days'
    OR MAX(rf.fired_at) IS NULL;

-- Columns with >50% null values across all rows
SELECT gc.field_name,
       COUNT(*) AS total_rows,
       COUNT(gc.value) AS filled,
       ROUND(100.0 * COUNT(gc.value) / COUNT(*), 1) AS fill_pct
FROM grid_cells gc
GROUP BY gc.field_name
HAVING ROUND(100.0 * COUNT(gc.value) / COUNT(*), 1) < 50;
```

---

## 6. Render targets — how the same content writes to Notion / Obsidian / Postgres

A document with primitives and grid data writes to all three sinks through **renderer engines** in `_engines/renderers/`. Each renderer maps Forge's internal types to the target format.

```
_engines/renderers/
├── notion.yaml       # primitive → Notion block type, grid row → Notion DB row
├── obsidian.yaml     # primitive → Obsidian callout/frontmatter, grid row → Dataview fields
├── postgres.yaml     # primitive → column in target table, grid row → INSERT
└── html.yaml         # primitive → HTML element, grid row → <table> row
```

Each renderer YAML defines a `type_map`:
```yaml
# obsidian.yaml (example)
name: Obsidian Renderer
type_map:
  link: "[[{{value}}]]"
  dropdown: "{{field_name}}:: {{value}}"      # Dataview inline field
  field: "{{field_name}}:: {{value}}"
  boolean: "{{field_name}}:: {{value}}"
  embed: "![[{{value}}]]"
section_wrapper: "\n---\n"
grid_row_format: frontmatter                   # frontmatter | inline | dataview
```

The document doesn't know which renderer will consume it. The renderer reads the grid schema + cells + primitives and produces its native output. Same source, many faces.

---

## 7. Full-text search path

v1: Postgres `tsvector` with GIN indexes on `sections.content_md`, `grid_cells.value`, `annotations.content`, and `mirror_entries.payload`. Good to ~500K rows.

```sql
-- Add FTS columns
ALTER TABLE sections ADD COLUMN tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_md, ''))) STORED;
ALTER TABLE grid_cells ADD COLUMN tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(value, ''))) STORED;
ALTER TABLE annotations ADD COLUMN tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED;

CREATE INDEX idx_sections_fts ON sections USING GIN(tsv);
CREATE INDEX idx_cells_fts ON grid_cells USING GIN(tsv);
CREATE INDEX idx_annotations_fts ON annotations USING GIN(tsv);
```

**Cross-entity search** (find a term across prose, cells, and annotations in one query):
```sql
SELECT 'section' AS source, section_id AS id, ts_rank(tsv, q) AS rank
FROM sections, to_tsquery('english', 'consciousness & entropy') q
WHERE tsv @@ q
UNION ALL
SELECT 'cell', cell_id, ts_rank(tsv, q)
FROM grid_cells, to_tsquery('english', 'consciousness & entropy') q
WHERE tsv @@ q
UNION ALL
SELECT 'annotation', annotation_id, ts_rank(tsv, q)
FROM annotations, to_tsquery('english', 'consciousness & entropy') q
WHERE tsv @@ q
ORDER BY rank DESC
LIMIT 20;
```

v2 (when scale demands it): Meilisearch or Typesense sidecar synced from Postgres via trigger or CDC.

---

## 8. Migration strategy

**Step 1:** Run this schema on the existing Postgres instance (192.168.1.177:2665). New tables, no conflict with FIS tables.

**Step 2:** Verify FIS `files` table is accessible from the same connection. If FIS is on a different database on the same instance, create a foreign data wrapper or move to same database.

**Step 3:** Forge boot sequence: on vault open, scan all markdown files → create `documents` rows for any that don't exist → parse primitives → create grid schemas from inline field definitions → populate cells.

**Step 4:** After Rule Substrate is built, rules created by the user land in both `_rules/` YAML and the `rules` table. YAML is the source of truth; Postgres is the query layer. On boot, Forge syncs YAML → Postgres (YAML wins on conflict).

---

## 9. Relationship to Codex monorepo structure

The monorepo Codex just built has:
- `packages/core/` — shared code including annotations, storage adapter
- `packages/desktop/` — Tauri app with TauriStorageAdapter
- `packages/cloud/` — Cloudflare stub with CloudStorageAdapter

**Where this schema lives:**
- SQL files go in `packages/core/sql/` (shared across desktop and cloud)
- The `StorageAdapter` interface in `packages/core/src/storage/StorageAdapter.ts` needs methods for every table: `getDocument()`, `upsertCell()`, `createRule()`, `logFiring()`, etc.
- `TauriStorageAdapter` implements via Tauri `invoke()` → Rust → psycopg direct to NAS Postgres
- `CloudStorageAdapter` implements via REST → Cloudflare Worker → D1 (or Postgres over Hyperdrive)

The adapter contract is one interface. The backend varies by deployment. The schema stays identical.

---

## 10. Decisions still open (flag to David)

1. **Same database or separate databases for FIS + Forge?** Recommended: same database, separate schemas (`fis.*` and `forge.*`). Keeps JOINs trivial.
2. **ULID generation — client or server?** Recommended: client-generated (in TypeScript) so IDs exist before the Postgres round-trip. Postgres stores them as TEXT.
3. **Grid schema evolution.** When a user adds a new column to a document's grid, what happens to existing rows? Recommended: new column gets null for all existing rows (sparse by default). No migration needed.
4. **Mirror entry retention.** Scrapes accumulate. How long to keep? Recommended: 90-day default, configurable per rule. Pruned by a scheduled engine in `_engines/`.

---

*End of Forge Data Graph Spec v1 — ready for review and hand-off.*
