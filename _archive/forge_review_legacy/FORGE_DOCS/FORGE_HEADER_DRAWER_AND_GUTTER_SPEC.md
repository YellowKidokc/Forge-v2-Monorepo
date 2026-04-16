# FORGE — Header Metadata Drawer & Dual Gutter Spec

**Status:** Draft 1 — ready for Codex
**Author:** Opus session, April 15, 2026
**Depends on:** FORGE_DATA_GRAPH_SPEC.md (sections, grid_cells), Annotation Engine, FORGE_GRID_RESOLUTION_SPEC.md
**Informed by:** Capacities object-typing UX (per-page typed objects → extended to per-section)

---

## 1. Header Drawer — the bloom behavior

You type `# My Header` and hit enter. The header **blooms** — the line below opens smoothly to reveal metadata rows, like a drawer sliding out:

```
┌─────────────────────────────────────────────────┐
│ # Evidence for MKUltra Timeline                 │  ← the header (always visible)
│─────────────────────────────────────────────────│
│ Tags:     [conspiracy] [government] [+]         │  ← row 1: tags (chips, type to add)
│ Domain:   [TP ▾]  Subject: [RS ▾] [CH ▾]       │  ← row 2: classification dropdowns
│ Source:   [postgres://cases.mkultra ▾]          │  ← row 3: data binding
│ Notes:    CIA subproject documentation_________  │  ← row 4: free text
│                                          [Done] │
└─────────────────────────────────────────────────┘
```

Fill in what you want, leave what you don't, hit **Done**. The drawer slides back up. Now the header shows:

```
# Evidence for MKUltra Timeline                  ›
```

That `›` chevron is the only indicator metadata lives behind it. Click it and the drawer opens again. Otherwise it's just a header. Prose flows immediately underneath. No clutter.

---

## 2. The 4 default slots

They're **slots** — same pattern as the annotation engine's 6-slot system. Default is 4, configurable per document or per template.

**Slot 1 — Tags.** Chip-style input. Type a tag, press enter, it becomes a pill. Tags write to `annotations` table with `target_type = 'section'` and `layer = 'tags'`. Searchable across all documents.

**Slot 2 — Classification.** Dropdown menus pulling from the FIS code system. Domain (TP, DT, EV, AP, etc.) and Subject codes. Write to the grid row backing this header section. Every primitive under this header inherits these codes unless overridden.

**Slot 3 — Data binding.** The Postgres connection. Where does this section's data come from? Could be a table, a view, a query, or nothing (pure prose). When bound, grid rows under this header are live-synced from that source. Dropdown shows available tables/views from the connected Postgres instance.

**Slot 4 — Notes.** Free text. Internal notes that never render to any output. For you, for AI partners, for context. Writes to `annotations` with `layer = 'notes'`.

Slots are swappable per template. Apologetics work → Slot 3 becomes "Scripture Reference." Investment research → Slot 2 becomes "Sector/Industry." The slot types are configurable in the template — this is what Excel templates define.

---

## 3. Static by default — "doesn't refill itself"

When the drawer collapses, metadata is **frozen in place**. It doesn't re-query Postgres on every render. It doesn't update from the source table. It doesn't change unless you open the drawer and edit it.

Without this, every header becomes a live widget constantly refreshing and flickering. Headers should feel like text, not dashboards. Set metadata once, it sits there, it's queryable from the database, but it doesn't animate or update on its own.

**Live sync is opt-in per header** — a toggle in Slot 3: `[Live ○]` / `[Live ●]`. Default is off. Most headers are reference, not real-time.

---

## 4. Storage

Every header creates three things in Postgres:

```
1. A section row   (section_id, doc_id, position, content_md = "# Evidence for MKUltra Timeline")
2. A grid_row      keyed to that section (row_id, doc_id, schema_id)
3. Grid cells      for each filled slot (cell_id, row_id, field_name, value)
```

Slot configuration lives in the grid schema. Empty slot = no cell row in Postgres. Only what you fill gets stored.

---

## 5. Animation

Physical feel. Not a toggle, not an instant swap.

- Header line stays pinned at top
- 4 rows slide out underneath — 200ms ease-out
- Content below pushes down smoothly
- Hit Done → reverse: rows slide up, content rises back
- Chevron rotates from `›` to `⌄` while open

Scrolling fast through a document → all drawers closed. Just headers with chevrons. Document reads like prose. Metadata is there but invisible until needed.

---

## 6. Dual Gutter System — classification left, annotations right

The header drawer is the CREATION view. The gutters are the READING view. After you fill the drawer and hit Done, the metadata settles into gutters.

### Layout

```
LEFT GUTTER          │  CONTENT                    │  RIGHT GUTTER
classification       │  prose / markdown            │  annotations
domain, tags,        │  the actual writing          │  AI notes,
type fields,         │                              │  references,
dropdowns            │                              │  cross-links
                     │                              │
[◂ collapse]         │                              │  [collapse ▸]
```

**Left gutter** = classification columns. Domain, subject codes, data bindings, typed fields (Author, Rating, etc.). Structural — defines what this section IS.

**Right gutter** = annotations. AI partner notes, user comments, cross-references, concordance entries. Interpretive — says what someone THINKS about this section.

### Indentation zones as metadata gutters

Indentation does double duty: shows document hierarchy AND creates horizontal space for classification columns. Deeper headers = more indent = more room for nested metadata in the gutter.

```
# MKUltra Case Brief                                    ›
     [Domain: TP]  [Category: PROGRAM]  [Status: Active]

  ## Subproject 68                                       ›
       [Evidence Tier: T2]  [Source Count: 14]

     This is the prose about Subproject 68. It flows
     normally. The reader sees this. The classification
     columns are to the LEFT in the gutter, not above
     in a drawer.

     ### Dr. Cameron's Techniques                       ›
          [Disputed: Yes]  [Timeline: 1957-1964]

        Content about Cameron sits here at another
        indent level. The gutter to the left shows
        ITS classification fields.
```

### Collapse states

```
FULL OPEN:     [classifications] │ prose │ [annotations]
LEFT ONLY:     [classifications] │ prose │
RIGHT ONLY:                      │ prose │ [annotations]
PROSE ONLY:                      │ prose │
```

Four states. Two toggle buttons, one per gutter. Or a single button that cycles: `[Full]` → `[Left]` → `[Right]` → `[Prose]` → back.

### Flow: creation → gutter

1. Type a header �� drawer blooms
2. Fill classification fields → hit Done
3. Drawer collapses into the left gutter
4. Fields visible as compact pills/labels in gutter column
5. Close gutter entirely → they disappear but data stays in Postgres

---

## 7. Section typing — the Capacities "Turn into" pattern

### What Capacities gets right

Every note is a typed object. "The Selfish Gene" IS a Book with fields (Author, Rating, Medium, Recommended by). The type dropdown changes the metadata structure. Clean.

### Where Capacities stops

Metadata is at the top of the page and that's it. No per-section metadata. No grid underneath. No rule engine. No cascading inheritance from H1 → H2 → H3. Flat — one level deep.

### What Forge does differently

**Per-section typing.** Right-click a header → "Turn into..." → section changes its object type → different fields appear in the left gutter.

- "Turn into... Axiom" → fields for axiom_id, chi_variables, depends_on, formal_statement
- "Turn into... Case Brief" → evidence_tier, source_count, OCS_score
- "Turn into... Person" → aliases, affiliations, timeline
- "Turn into... Book" → author, rating, medium, recommended_by
- "Turn into... Bible Study" → scripture_ref, strongs_numbers, cross_refs, commentary_source

The type determines the gutter schema. Same pattern as Capacities but applied per-section, not just per-page.

### Schema addition

```sql
ALTER TABLE sections ADD COLUMN section_type TEXT DEFAULT 'prose';
-- prose | axiom | case_brief | person | book | investment | bible_study | custom
```

Each section type maps to a predefined set of gutter fields — which is exactly what the Excel templates define. Each template IS a section type. When Codex builds the templates, each one becomes a `section_type` with its own gutter field set.

### Cascading inheritance

H1 sets Domain: TP → all H2s and H3s under it inherit Domain: TP unless they override. Classification cascades down the hierarchy. Override at any level, and everything below that override inherits the new value.

```
H1 [Domain: TP, Category: PROGRAM]
  H2 [inherits Domain: TP, Category: EVENT]    ← overrides Category
    H3 [inherits Domain: TP, Category: EVENT]  ← inherits from H2
  H2 [inherits Domain: TP, Category: PROGRAM]  ← inherits from H1
```

---

## 8. Updated toolbar

```
Status bar:
[Grain: Word]  [Left ◂]  [Right ▸]  [Rules 🔵12]  [Layers ▾]  [Expand All]
```

| Button | Function |
|--------|----------|
| `[Grain: Word]` | Cycles grid resolution: Word → Char → Full |
| `[Left ◂]` | Toggles classification gutter. Icon flips when collapsed. `Ctrl+[` |
| `[Right ▸]` | Toggles annotation gutter. Icon flips when collapsed. `Ctrl+]` |
| `[Rules 🔵12]` | Shows active rule count. Click opens Rules Table. |
| `[Layers ▾]` | Dropdown for annotation layer visibility toggles. |
| `[Expand All]` | Opens every header drawer at once. Click again to collapse all. |

---

## 9. UX principle shared with Grain toggle

**Detail is always available but never forced.** Grain zooms the grid resolution. Header drawers zoom the metadata resolution. Gutters zoom the classification/annotation resolution. All collapse to minimal visible state by default.

---

## 10. Build order

1. Add `section_type` column to `sections` table.
2. Define section type → gutter field mappings (from Excel templates when ready).
3. Build header drawer component (bloom animation, 4 configurable slots).
4. Build left gutter renderer (reads section metadata, shows as compact pills).
5. Build right gutter renderer (reads annotations, shows as note cards).
6. Build gutter collapse toggles (`[Left ◂]` / `[Right ▸]` buttons).
7. Build "Turn into..." context menu for section type switching.
8. Build cascading inheritance logic (H1 → H2 → H3 field inheritance).
9. Build `[Expand All]` toggle.
10. Wire drawer collapse → gutter display transition.

---

*End of Header Metadata Drawer & Dual Gutter Spec v1.*
