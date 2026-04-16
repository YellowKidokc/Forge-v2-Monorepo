# FORGE — Layer 3 Rule Substrate Spec

**Status:** Draft 1 — ready for Codex
**Author:** Opus session, April 15, 2026
**Supersedes:** Vague "AI Partners run silent" references in FORGE_BUILD_SPEC_MASTER and March 10 Layer 0 spec
**Depends on:** FORGE_DATA_GRAPH_SPEC.md (must land first — this spec assumes the ID graph exists)

---

## 1. What this layer does

Layer 3 is the **rule engine** that sits on the Excel/Grid layer. It converts natural-language instructions attached to cells or columns into persistent, firing rules. It is the mechanism by which the unconstrained AI Partner principle (March 10) becomes addressable: the user points at a primitive, speaks in English, and a rule attaches to the underlying cell.

The AI Partners (Connector / Challenger / Archivist) do not live in a separate process. They are specialist queries over the Postgres spine defined in FORGE_DATA_GRAPH_SPEC. Their background work is the same thing as rule firing; their "surfacing" is the same thing as querying the rule_firings and mirror_entries tables.

---

## 2. Core mechanism — selection becomes address

**User action:**
1. User selects a primitive in the Top layer (a link, dropdown, field, or span of text).
2. The selection resolves to a `cell_id` or column target in the Excel layer (the grid under the prose).
3. User opens the inline AI bubble (existing Layer 2 component) and types a natural-language instruction.
4. AI translates the instruction into a structured rule YAML and proposes it for approval.
5. User approves → rule lands in `_rules/` folder and is registered in Postgres.
6. Rule fires per its configured trigger from that point forward.

**Example:**
- User highlights a link `https://someblog.substack.com/p/foo` in prose.
- User types: "anytime it gives me this link redirect it to my reading list"
- AI proposes:
  ```yaml
  rule_id: r_01H9ZKBC...
  name: "Substack links to reading list"
  target:
    column: links
    pattern_type: domain
    pattern: "*.substack.com"
  action:
    type: mirror_write
    target: reading_list
    payload_template: "{{cell.value}}"
  fires_on: insert
  created_by: user
  created_at: 2026-04-15T22:14:00Z
  ```
- User approves → rule saved → next time any `*.substack.com` URL lands in the `links` column of any document, the rule fires.

---

## 3. Rule storage

**Location:** `vault/_rules/` — auto-discovered on Forge boot, same pattern as `_engines/`.

**One YAML per rule.** No nesting. Filename is `{rule_id}.yaml` for durability (rename the display name anytime without breaking references).

**Required fields:**
- `rule_id` — ULID, stable, never changes
- `name` — display name, user-editable
- `target` — what the rule watches (column, row, cell pattern)
- `action` — what the rule does (see §5)
- `fires_on` — `insert` | `update` | `save` | `render` | `manual`
- `created_by`, `created_at`, `last_modified_at`

**Optional fields:**
- `stacked_with` — array of rule_ids that fire together (see §6)
- `execution_order` — integer, default by creation order
- `active` — boolean, default true (disabling is not deletion)
- `description` — free text, user notes

---

## 4. Pattern matching

The `target.pattern_type` controls how matching works. Minimum viable set:

| pattern_type | Meaning | Example |
|---|---|---|
| `exact` | Cell value equals pattern | `"https://x.com/y"` |
| `domain` | URL's domain matches | `"*.substack.com"` |
| `prefix` | Cell value starts with | `"https://github.com/"` |
| `regex` | Full regex match | `"^[A-Z]{2}-\\d+$"` |
| `contains` | Substring match | `"theophysics"` |
| `any` | Fires on any value in the column | (no pattern field) |

**AI's job during rule creation** is to translate fuzzy user speech into the right pattern_type. "Anytime it gives me this link" with a Substack URL → `domain: *.substack.com`, not `exact`. The AI proposes; the user confirms or edits. If unclear, the AI asks one clarifying question before committing.

---

## 5. Actions

Actions are what the rule does when it fires. Each action is a named type with a payload schema. New action types are added as plugins in `_engines/actions/` (same YAML+script pattern as existing engines).

**v1 action types:**

| type | What it does |
|---|---|
| `mirror_write` | Writes a payload to a named list/table in the mirror folder |
| `redirect` | Replaces the cell value with a computed value (use with caution — destructive) |
| `scrape` | Runs a fetch on the URL, lands result in mirror |
| `tag` | Adds a tag to the document or row |
| `notify` | Surfaces a message to the user (next time they open the doc) |
| `chain` | Triggers another rule by rule_id |
| `engine_call` | Invokes a YAML engine from `_engines/` and passes the cell as input |

`redirect` is the only destructive action in v1. All others write to the mirror layer or to metadata — the source content is never modified by a rule.

---

## 6. Rule stacking — the Dual Layer mechanism

When two or more rules target the same cell or matching pattern, the system does not arbitrate. It **stacks**.

**UI:** When a user creates a second rule targeting the same column+pattern, Forge detects the collision and shows a dialog:

> *"2 rules now target `links` column with pattern `*.substack.com`. How should they run?"*
> **[Dual Layer — both fire]** | **[Replace existing]** | **[Resolve conflict]**

**Dual Layer:** Both rules fire in sequence, each with its own entry in `rule_firings`. Order is draggable; default is creation order (oldest first). The `stacked_with` field on each rule lists the others.

**Replace:** New rule wins, old rule is marked `active: false` but not deleted.

**Resolve conflict:** Only offered when actions are incompatible (e.g., two `redirect` rules to different targets — cell value can only be one thing). User must pick one or edit to make them compatible.

**N-Layer:** Three or more rules stack identically. No cap. The `stacked_with` field holds them all.

**Conflict detection rule:** Actions are compatible (stackable by default) if they **all** write to distinct targets or non-destructive channels (mirror, tag, notify). Actions are conflicting if two or more are `redirect` on the same cell, or two or more `engine_call`s to engines that write the same cell. The system detects this from the action schemas — no hand-coded list.

---

## 7. Firing and telemetry

Every rule fire produces a row in `rule_firings` (see DATA_GRAPH_SPEC §4):

```
firing_id, rule_id, target_cell_id, input_value,
success (bool), error_message (nullable), output_mirror_id (nullable),
fired_at
```

This table is append-only and is the source of truth for questions like:
- Which rules fire most / least
- Which rules started failing recently
- Which cells were last touched by which rule
- Full audit trail for any mirror entry

Rules that fail three times in a row on the same cell are **auto-paused** (`active: false`) and the user is notified next time they open the document. Failure criterion: action raised an exception or returned a documented error.

---

## 8. Visibility UI

Three views, all reading from Postgres, all queryable:

**Rules Table** (main surface)
- Every rule in the system
- Columns: name, target column, pattern, action type, last fired, # fires, active
- Sortable, filterable
- Click a row → rule detail with recent firings
- Multi-select → bulk disable / bulk delete

**Inline rule inspection** (contextual)
- Right-click any primitive → "Show rules attached to this column"
- Small popover listing active rules that match this primitive's column+value
- Click a rule → jumps to Rules Table filtered to that rule

**Status bar indicator**
- Persistent: "47 active rules, 3 failing"
- Click → Rules Table filtered to `active=true` and recent failures highlighted

---

## 9. AI Partner specialization as rule queries

The roles from the March 10 unconstrained-AI spec map onto queries over the rule and data graph:

| Role | What it actually does (SQL + prompt) |
|---|---|
| **Connector** | `SELECT cells with identical values across different documents` → prompt asks "is this a meaningful cross-reference?" |
| **Challenger** | `SELECT cells with conflicting rule outputs` + `SELECT rules that failed > 3 times` → prompt asks "is there a contradiction here?" |
| **Archivist** | `SELECT primitives with no rules attached` + `SELECT rules that haven't fired in 30 days` + `SELECT columns with missing values across >50% of rows` → prompt asks "is this a gap worth flagging?" |

They do not run as daemons. They run when the user asks ("what have you noticed?") or when a threshold hits (pattern count, failure count, idle time). Threshold defaults in `_config/partners.yaml`, user-editable.

---

## 10. Out of scope for v1

- Rules that fire across documents atomically (e.g., "when A changes, also change B in another doc"). v1 fires per-cell on insert/update. Cross-doc rules are v2.
- Rule versioning / history. v1 stores current YAML only. If you edit a rule, the old form is gone. Git handles this at the vault level for now.
- External triggers (webhooks, cron, file-system events outside the vault). v1 fires on Forge-internal events only. External triggers are v2.
- Rules on prose text itself (the "when I write the word X, do Y"). v1 is scoped to grid cells. Prose rules are v2.

---

## 11. Build order

1. **Postgres schema for rules and firings.** (Depends on DATA_GRAPH_SPEC.)
2. **`_rules/` folder discovery + YAML load on boot.**
3. **Rule engine core:** match a cell against a rule's pattern, dispatch to action.
4. **Action types:** start with `mirror_write`, `scrape`, `tag`. Add `redirect`, `chain`, `engine_call` after.
5. **Selection → rule-creation flow:** extend existing inline AI bubble to produce rule YAML instead of one-off edits.
6. **Rules Table view.**
7. **Dual Layer / conflict detection.**
8. **Telemetry dashboard (status bar + failure auto-pause).**
9. **AI Partner query specializations.**

Estimated span: 2-3 weeks of focused work if data graph is already in place. Longer if Codex/Claude Code are swapping and re-syncing.

---

## 12. Decisions still open (flag to David before Codex starts)

1. **Rule ownership across AI Partners.** Can an AI Partner *create* rules autonomously, or only propose them? Recommended default: propose only, user approves. But worth confirming.
2. **Rule export/import.** Should rules be shareable between vaults? Format is already portable (YAML), but no mechanism exists yet. v1 or v2?
3. **Destructive action confirmation.** Should `redirect` require confirmation on every fire, or only on rule creation? Recommended: confirmation on creation, silent on fire. Otherwise the system becomes nagware.
4. **Natural language rule deletion.** Should the user be able to say "stop the Substack rule" in the inline bubble? Or is deletion only via the Rules Table? Recommended: both, but the Table is authoritative.

---

*End of Layer 3 Rule Substrate Spec v1 — ready for review and hand-off.*
