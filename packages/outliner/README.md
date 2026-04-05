# outliner

Reusable React outliner editor package.

## Scope

This package is intentionally generic and only works with page/block data.
It does not know about activity/task/story domain structures.

## Install/Use in This Monorepo

```tsx
import Outliner from 'outliner'
import 'outliner/styles.css'
```

## Public Interface

Exports from `outliner`:

- default export: outliner React component
- named export: `__testing` (internal helpers for tests)
- type exports:
  - `OutlinerBlock`
  - `OutlinerPage`
  - `OutlinerProps`

### Types

```ts
export type OutlinerBlock = {
  id: string
  content: string
  children: OutlinerBlock[]
}

export type OutlinerPage = {
  id: string
  title: string
  blocks: OutlinerBlock[]
}

export type OutlinerProps = {
  pages: OutlinerPage[]
  onPagesChange: (next: OutlinerPage[]) => void
  onBlockFocus?: (blockId?: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}
```

### Component Contract

- `pages` is the source of truth from the parent.
- Editing operations emit normalized next data through `onPagesChange`.
- Focusing any editable block calls `onBlockFocus(blockId)` when provided.
- Undo/redo keyboard shortcuts call `onUndo` and `onRedo`.
- `canUndo` and `canRedo` control toolbar button disabled state.

## Supported Keyboard Behaviors

| Keys | Behavior |
| --- | --- |
| `Cmd/Ctrl + Z` | Calls `onUndo()` |
| `Cmd/Ctrl + Y` | Calls `onRedo()` |
| `Cmd/Ctrl + Shift + Z` | Calls `onRedo()` |
| `Enter` | Splits current block at caret into two blocks |
| `Enter` on empty nested leaf | Breaks out one level (outdent) |
| `Enter` on empty top-level leaf | Promotes to a new page-level item |
| `Backspace` | At caret start, merges current block into previous logical block (page-level lines merge to previous page-level line) |
| `Backspace` on empty nested block | Merges into previous logical block (acts like remove-and-merge, not a pure outdent) |
| `Delete` | If block is empty, deletes current block |
| `Delete` at end of block | Merges with next logical block when available |
| `Tab` | Indents current block |
| `Tab` on page-level item | Indents under previous page-level line |
| `Shift + Tab` | Outdents current block |
| `Shift + Tab` on top-level block | Promotes to a new page-level item |
| `Option/Alt + ArrowUp` | Moves current block up among siblings |
| `Option/Alt + ArrowDown` | Moves current block down among siblings |
| `Option/Alt + ArrowLeft` | Outdents current block |
| `Option/Alt + ArrowRight` | Indents current block |
| `Cmd/Ctrl + Shift + ArrowUp` | Alias: moves current block up among siblings |
| `Cmd/Ctrl + Shift + ArrowDown` | Alias: moves current block down among siblings |

Behavior notes:
- On macOS, `Option` maps to `Alt` in keyboard events.
- Some actions are no-ops when structurally invalid.
- Backspace on a page-level item at the first character merges into the previous line.
- Backspace on an empty indented block currently performs merge/remove semantics rather than a pure outdent.
- Delete at end-of-line currently performs merge-with-next when a next block exists.
- Newly broken-out items retain content through `Tab`/`Shift+Tab` round-trips.
- Newly broken-out items keep focus/caret and accept immediate `Enter`/`Tab`/`Shift+Tab` input.
- Content changes are committed on key-up for non-structural keys.
- Caret position is preserved/restored around structural mutations when possible.

## Tree Split Patterns

### Create a second top-level tree from a parent line

Given:

```text
- tree1
  - item 1
```

Steps:
1. Place caret at the end of `tree1`.
2. Press `Enter`.
3. Type `tree2`.

Result:

```text
- tree1
  - item 1
- tree2
```

### Create from a child line, then promote to top-level

Given:

```text
- tree1
  - item 1
```

Steps:
1. Place caret at the end of `item 1`.
2. Press `Enter` (creates a new sibling child).
3. Press `Shift+Tab` (outdents it to top-level).
4. Type `tree2`.

Result:

```text
- tree1
  - item 1
- tree2
```

## Styling

```ts
import 'outliner/styles.css'
```

## Testing

```bash
npm run test --workspace=outliner
```
