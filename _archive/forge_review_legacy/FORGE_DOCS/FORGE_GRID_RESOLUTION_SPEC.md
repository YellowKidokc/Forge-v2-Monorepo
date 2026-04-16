# FORGE — Grid Resolution Toggle Spec

**Status:** Draft 1 — ready for Codex
**Author:** Opus session, April 15, 2026
**Depends on:** FORGE_DATA_GRAPH_SPEC.md (grid_cells table), Annotation Engine (grain field)

---

## 1. What this is

The **Grain** button. Three clicks, three zoom levels on the same data. Changes selection granularity without touching existing rules or annotations.

---

## 2. The three modes

### Click 1 — Word mode (default)
Each word is a cell. "The quick brown fox" = 4 cells. This is where you live 90% of the time. Tagging, rules, annotations, link-ups — all word-level. The grid is compact, readable, fast.

### Click 2 — Character mode
Each character is a cell. "The" = 3 cells. For equation editing where χ and ψ are individual addressable symbols. For foreign language work where one kanji matters. For find-and-replace at surgical precision. Grid expands but still skips whitespace.

### Click 3 — Full mode
Every character, every space, every period, every line break is a cell. "The. " = 5 cells (T, h, e, period, space). This is for when layout IS meaning — poetry where the line break is semantic, legal text where a misplaced comma changes the contract, code where indentation matters, verse formatting where you need to control exactly where things land.

---

## 3. UI — the Grain button

A small icon in the status bar / bottom bar area that cycles through three states:

```
[Grain: Word]  → coarse grid, fewest cells     [▪▪▪]
[Grain: Char]  → medium grid, skip whitespace   [▪▪▪▪▪]
[Grain: Full]  → finest grid, everything        [▪▪▪▪▪▪▪▪]
```

Single click cycles: Word → Char → Full → Word.

Visual density indicator changes with the mode — more dots = finer grain. The button name is **Grain**. One word, clear meaning.

---

## 4. Architectural rules

### Resolution changes selection, not rules
When you attach a rule to a cell in word mode, the rule targets a word. When you switch to character mode, that same rule still targets the word — it doesn't fragment into per-character rules. The resolution toggle changes **selection granularity**, not **rule granularity**.

But if you're IN character mode and create a new rule on a single character, that rule is character-level. The system tracks which resolution a rule was authored at:

```yaml
# Added to rule YAML
resolution: word | char | full
```

### Same for annotations
A note attached at word level stays word-level even when you zoom to character mode. In char mode, you see "this annotation covers characters 1-5" (the whole word) instead of "this annotation is on this word."

### Internal storage is always full resolution
The grid **always stores at full resolution internally** but **renders at the selected resolution**. Switching modes is instant — just a different grouping of the same underlying data. No recomputation.

Cell IDs at full resolution are the source of truth. Word-mode cells are computed aggregates of contiguous non-whitespace character cells.

---

## 5. Performance

| Mode | 5,000 word document | Notes |
|------|--------------------:|-------|
| Word | ~5,000 cells | Fine |
| Char | ~30,000 cells | Manageable |
| Full | ~35,000 cells | Fine for Postgres, needs virtual scrolling in UI |

Virtual scrolling is mandatory for Char and Full modes. Don't render 35,000 DOM elements. Render the visible viewport + buffer.

---

## 6. Schema additions

### grid_cells table (Data Graph Spec update)
```sql
resolution  TEXT DEFAULT 'word'   -- word | char | full
```

### grid_schemas table (display setting per document)
```sql
display_resolution  TEXT DEFAULT 'word'  -- current view mode for this document
```

### Rule YAML
```yaml
resolution: word    # word | char | full — set at creation time, immutable
```

### Annotation anchor (Annotation Engine update)
The existing `grain` field in `AnnotationAnchor` already supports `'word' | 'phrase' | 'line' | 'block' | 'document'`. Extend to include `'char' | 'full'`:

```typescript
grain: 'char' | 'word' | 'phrase' | 'line' | 'block' | 'document' | 'full';
```

---

## 7. Rendering logic

```typescript
type GridResolution = 'word' | 'char' | 'full';

function getCellsAtResolution(fullCells: GridCell[], resolution: GridResolution): GridCell[] {
  switch (resolution) {
    case 'full':
      return fullCells; // every character, space, punctuation
    case 'char':
      return fullCells.filter(c => !isWhitespace(c.value)); // characters only, skip spaces
    case 'word':
      return aggregateToWords(fullCells); // group contiguous non-whitespace into word cells
  }
}
```

The `aggregateToWords` function groups contiguous non-whitespace character cells into a single word cell. The word cell's `cell_id` is the first character cell's ID (stable reference). The word cell's `value` is the concatenation of all character values.

---

## 8. Interaction with existing systems

| System | How Grain affects it |
|--------|---------------------|
| **Rules** | `resolution` field on rule. Rule matching respects its authored resolution regardless of current display. |
| **Annotations** | `grain` field on anchor. Annotation stays at authored grain. Display adapts. |
| **Grid Layer** (`lib/grid.ts`) | `getCellRange`, `queryByTag`, `queryByFlag` need resolution parameter. Default: current display resolution. |
| **Toolbar** | Grain button in BottomBar or status area. |
| **Search** | Full-text search always operates at full resolution (searches everything). |
| **Templates** | Templates store their default resolution in the grid schema. |

---

## 9. Build order

1. Add `resolution` field to `grid_cells` schema and `display_resolution` to `grid_schemas`.
2. Update `lib/grid.ts` — internal storage at full resolution, `getCellsAtResolution()` function.
3. Build the Grain button component in BottomBar.
4. Update GridLayer.tsx rendering to respect current resolution with virtual scrolling.
5. Update rule creation to stamp `resolution` from current display mode.
6. Update annotation creation to stamp `grain` from current display mode.
7. Update `useGrid` hook to expose current resolution and toggle function.

---

*End of Grid Resolution Toggle Spec v1.*
