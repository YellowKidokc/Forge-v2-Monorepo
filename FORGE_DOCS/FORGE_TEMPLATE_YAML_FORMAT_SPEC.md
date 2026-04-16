# FORGE — Template YAML Format Spec

**Status:** Draft 1 — ready for Codex
**Author:** Opus session, April 15, 2026
**Depends on:** FORGE_HEADER_DRAWER_AND_GUTTER_SPEC.md, FORGE_LAYER3_RULE_SUBSTRATE_SPEC.md, Annotation Engine

---

## 1. What a template is

A template is a section type with a field list. Once it exists, it works everywhere.

Four things stored as one YAML:
1. Section type name
2. Left gutter fields (classification)
3. Right gutter layers (annotations)
4. Default rules that auto-attach

That's it. The YAML is ~15 lines. The template IS the field list plus the default rules plus the annotation layers. Nothing else.

---

## 2. Format

```yaml
name: "Conspiracy Case Brief"
section_type: case_brief
left_gutter:
  - { name: category, type: dropdown, options: [EVENT, PROGRAM, INSTITUTION, PROPAGANDA, PROPHETIC, PHENOMENON, PATTERN, SYMBOL, CULTURAL] }
  - { name: evidence_tier, type: dropdown, options: [T1, T2, T3, T4, T5, N] }
  - { name: ocs_score, type: number, computed: true }
  - { name: source_url, type: url, rule: auto_scrape }
right_gutter:
  - Commentary
  - Evidence
  - AI Analysis
default_rules:
  - { column: source_url, action: scrape, fires_on: insert }
```

---

## 3. Storage

**Location:** `vault/_engines/templates/` — auto-discovered on Forge boot, same pattern as `_engines/` and `_rules/`.

One YAML per template. Filename is `{section_type}.yaml`. The `section_type` value must be unique across all templates.

---

## 4. Field types

| type | Renders as | Stores as |
|------|-----------|-----------|
| `text` | Free text input | TEXT in grid_cells |
| `number` | Numeric input | TEXT (typed by schema) |
| `dropdown` | Select menu with options | TEXT (selected value) |
| `url` | URL input with link icon | TEXT |
| `boolean` | Toggle switch | TEXT ('true'/'false') |
| `date` | Date picker | TEXT (ISO 8601) |
| `tags` | Chip input (multi-value) | JSONB array in annotations |
| `reference` | Link to another section/document | TEXT (target ULID) |
| `computed` | Read-only, calculated from other fields | TEXT (engine computes) |

---

## 5. Computed fields

When `computed: true`, the field value is derived from other fields or from rule outputs. The computation is defined either:
- Inline in the YAML: `{ name: ocs_score, type: number, computed: true, formula: "evidence_tier * source_count" }`
- Or by an engine reference: `{ name: ocs_score, type: number, computed: true, engine: ocs_calculator }`

Computed fields are read-only in the gutter UI. They update when their inputs change (if the header drawer's Live toggle is on) or on explicit refresh.

---

## 6. Default rules

Rules listed under `default_rules` auto-attach when a section is assigned this template type. Each entry maps to a rule YAML that gets created in `_rules/` with the rule's `target_column` set to the specified column.

```yaml
default_rules:
  - { column: source_url, action: scrape, fires_on: insert }
  - { column: category, action: tag, fires_on: save, payload_template: "{{cell.value}}" }
```

The rule is proposed to the user on first assignment (same approval flow as manual rule creation). Once approved, it persists independently of the template.

---

## 7. Right gutter layers

The `right_gutter` array names which annotation layers activate when this template is assigned. These must match layer IDs from the annotation engine's `LayerConfig`.

If a named layer doesn't exist yet, Forge creates it with default settings (color auto-assigned from palette, marker style = 'dot').

---

## 8. Discovery and "Turn into..."

On boot, Forge scans `_engines/templates/*.yaml`. Each template registers as a `section_type` option. The "Turn into..." context menu on any header lists all discovered templates plus the built-in `prose` type.

When user selects a template:
1. `sections.section_type` updates to the template's `section_type`
2. Grid schema for that section updates to include all `left_gutter` fields
3. Right gutter activates the named annotation layers
4. Default rules are proposed for approval
5. Header drawer opens with the new fields ready to fill

---

## 9. AI self-templating

When an AI Partner notices you've manually set up the same N fields on M different headers (threshold: 3+ fields appearing on 5+ headers), it proposes a template YAML. You approve it. Now template #N exists. You didn't design it — it crystallized from your behavior.

The AI query:
```sql
-- Find repeated field patterns across sections
SELECT array_agg(DISTINCT gc.field_name ORDER BY gc.field_name) AS field_set,
       COUNT(DISTINCT s.section_id) AS section_count
FROM grid_cells gc
JOIN grid_rows gr ON gc.row_id = gr.row_id
JOIN sections s ON gr.doc_id = s.doc_id AND gr.position = s.position
WHERE s.section_type = 'prose'  -- only un-typed sections
GROUP BY s.doc_id
HAVING COUNT(DISTINCT gc.field_name) >= 3
ORDER BY section_count DESC;
```

If a field set appears on 5+ sections, the Archivist partner proposes: "I notice you keep using [category, evidence_tier, source_url] on case headers. Want me to create a template for that?"

---

## 10. Example templates

### Bible Study
```yaml
name: "Bible Study"
section_type: bible_study
left_gutter:
  - { name: scripture_ref, type: text }
  - { name: strongs_numbers, type: tags }
  - { name: original_language, type: dropdown, options: [Hebrew, Greek, Aramaic] }
  - { name: cross_refs, type: tags }
right_gutter:
  - Commentary
  - Concordance
  - AI Analysis
default_rules: []
```

### Investment Memo
```yaml
name: "Investment Memo"
section_type: investment_memo
left_gutter:
  - { name: ticker, type: text }
  - { name: sector, type: dropdown, options: [Tech, Healthcare, Energy, Finance, Consumer, Industrial] }
  - { name: thesis, type: text }
  - { name: target_price, type: number }
  - { name: risk_rating, type: dropdown, options: [Low, Medium, High, Critical] }
right_gutter:
  - Commentary
  - Evidence
  - Calculations
default_rules:
  - { column: ticker, action: scrape, fires_on: insert }
```

### Person Dossier
```yaml
name: "Person Dossier"
section_type: person
left_gutter:
  - { name: aliases, type: tags }
  - { name: affiliations, type: tags }
  - { name: timeline_start, type: date }
  - { name: timeline_end, type: date }
  - { name: status, type: dropdown, options: [Active, Historical, Deceased, Unknown] }
right_gutter:
  - Commentary
  - Evidence
  - Links
default_rules: []
```

### Axiom
```yaml
name: "Axiom"
section_type: axiom
left_gutter:
  - { name: axiom_id, type: text }
  - { name: chi_variables, type: tags }
  - { name: depends_on, type: tags }
  - { name: formal_statement, type: text }
  - { name: confidence, type: number }
right_gutter:
  - Commentary
  - AI Analysis
  - Evidence
default_rules: []
```

---

*End of Template YAML Format Spec v1.*
