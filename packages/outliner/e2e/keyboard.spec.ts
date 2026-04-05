import { expect, test } from '@playwright/test'

type StateShape = {
  pages: Array<{
    id: string
    title: string
    blocks: Array<{
      id: string
      content: string
      children: Array<{ id: string; content: string; children: Array<unknown> }>
    }>
  }>
  focusedBlockId?: string
  history: { past: number; future: number }
  ids: string[]
}

async function readState(page: import('@playwright/test').Page): Promise<StateShape> {
  const raw = await page.getByTestId('state').innerText()
  return JSON.parse(raw) as StateShape
}

async function setCaret(page: import('@playwright/test').Page, blockId: string, offset: number) {
  await page.evaluate(
    ({ id, caretOffset }) => (window as Window & { __outlinerE2E?: { setCaret: (blockId: string, offset: number) => boolean } }).__outlinerE2E?.setCaret(id, caretOffset),
    { id: blockId, caretOffset: offset },
  )
}

async function setBlockContent(page: import('@playwright/test').Page, blockId: string, content: string) {
  const ok = await page.evaluate(
    ({ id, value }) =>
      (window as Window & {
        __outlinerE2E?: { setBlockContent: (targetId: string, nextContent: string) => boolean }
      }).__outlinerE2E?.setBlockContent(id, value) ?? false,
    { id: blockId, value: content },
  )

  expect(ok).toBe(true)
}

async function readSelectedText(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => window.getSelection()?.toString() ?? '')
}

async function readCaretOffset(page: import('@playwright/test').Page, blockId: string): Promise<number> {
  return page.evaluate((id) => {
    const block = document.getElementById(id)
    if (!(block instanceof HTMLElement)) return -1

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return -1
    const range = selection.getRangeAt(0)
    if (!block.contains(range.startContainer)) return -1

    const measurement = range.cloneRange()
    measurement.selectNodeContents(block)
    measurement.setEnd(range.startContainer, range.startOffset)
    return measurement.toString().length
  }, blockId)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('splits block at caret with Enter', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 4)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(3)
  expect(state.pages[0]?.blocks[0]?.content).toBe('Task')
  expect(state.pages[0]?.blocks[1]?.content).toBe(' 1')
})

test('splits at end of block into empty sibling', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.content).toBe('Task 1')
  expect(state.pages[0]?.blocks[1]?.content).toBe('')
})

test('Enter at parent end then typing creates a new top-level sibling', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('Enter')
  await page.keyboard.type('tree2')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[1]?.content)
    .toBe('tree2')

  const state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])
})

test('splits at start of block and shifts text into next sibling', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.content).toBe('')
  expect(state.pages[0]?.blocks[1]?.content).toBe('Task 1')
})

test('splitting a parent block keeps its existing child subtree on the original block', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 4)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  const original = state.pages[0]?.blocks[0]
  const inserted = state.pages[0]?.blocks[1]
  expect(original?.content).toBe('Task')
  expect(original?.children.map((child) => child.id)).toEqual(['story:s1'])
  expect(inserted?.content).toBe(' 1')
  expect(inserted?.children).toEqual([])
})

test('splits nested child at caret into sibling children under same parent', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 5)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  const children = state.pages[0]?.blocks[0]?.children ?? []
  expect(children).toHaveLength(2)
  expect(children[0]?.id).toBe('story:s1')
  expect(children[0]?.content).toBe('Story')
  expect(children[1]?.content).toBe(' 1')
})

test('splits nested child at start into empty child plus text sibling under same parent', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  const children = state.pages[0]?.blocks[0]?.children ?? []
  expect(children).toHaveLength(2)
  expect(children[0]?.id).toBe('story:s1')
  expect(children[0]?.content).toBe('')
  expect(children[1]?.content).toBe('Story 1')
})

test('splits nested child at end into empty sibling child that can be typed into', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 7)
  await page.keyboard.press('Enter')

  const afterSplit = await readState(page)
  const newChild = afterSplit.pages[0]?.blocks[0]?.children[1]
  expect(newChild?.content).toBe('')

  await page.keyboard.type('tree2')
  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.children[1]?.content)
    .toBe('tree2')

  const finalState = await readState(page)
  expect(finalState.pages[0]?.blocks[0]?.children[1]?.id).toBe(newChild?.id)
})

test('does not structurally split on Shift+Enter', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 4)
  await page.keyboard.press('Shift+Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(2)
})

test('does not structurally split on Ctrl+Enter', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 4)
  await page.keyboard.press('Control+Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(2)
})

test('persists a space key edit in current block', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('Space')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.content)
    .toBe('Task 1 ')
})

test('keeps caret direction for regular key typing (no jump to line start)', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.type('abc')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.content)
    .toBe('Task 1abc')
})

test('keeps caret direction for space then regular key typing', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('Space')
  await page.keyboard.type('abc')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.content)
    .toBe('Task 1 abc')
})

test('merges with Backspace at start of block', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Backspace')

  const state = await readState(page)
  const firstTask = state.pages[0]?.blocks[0]
  expect(firstTask?.children.length).toBe(0)
  expect(firstTask?.content).toContain('Task 1Story 1')
})

test('Backspace at start of page-level block merges into previous page leaf', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Backspace')

  const state = await readState(page)
  expect(state.pages).toHaveLength(2)
  expect(state.pages[0]?.blocks[0]?.children[0]?.content).toBe('Story 1Story 2')
  expect(state.pages[1]?.blocks).toEqual([])
})

test('Backspace at page-level first char merges into previous top-level line', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Shift+Tab')

  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Backspace')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1'])
  expect(state.pages[0]?.blocks[1]?.content).toBe('Story 1Story 2')
})

test('Backspace child->parent merge keeps caret at merge boundary', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Backspace')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.content)
    .toBe('Task 1Story 1')

  const offset = await readCaretOffset(page, 'task:t1')
  expect(offset).toBe('Task 1'.length)
})

test('Backspace empty child->parent merge keeps caret at parent end boundary', async ({ page }) => {
  await setBlockContent(page, 'story:s1', '')
  await page.click('#story\\:s1')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.children[0]?.content)
    .toBe('')

  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Backspace')

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks[0]?.content)
    .toBe('Task 1')

  const offset = await readCaretOffset(page, 'task:t1')
  expect(offset).toBe('Task 1'.length)
})

test('Backspace at first top-level block start is a structural no-op', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Backspace')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
})

test('edits text with Backspace in the middle without structural merge', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 3)
  await page.keyboard.press('Backspace')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(2)
  expect(state.pages[0]?.blocks[0]?.content).toBe('Tak 1')
})

test('indents and outdents with Tab shortcuts', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Tab')

  let state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(1)
  expect(state.pages[0]?.blocks[0]?.children.map((child) => child.id)).toContain('task:t2')

  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  state = await readState(page)
  expect(state.pages).toHaveLength(1)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
})

test('Tab on first page-level block indents under previous top-level line', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Shift+Tab')

  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Tab')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1'])
  expect(state.pages[0]?.blocks[1]?.children.map((child) => child.id)).toEqual(['story:s2'])
})

test('Shift+Tab on top-level block promotes it to a new page', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  const state = await readState(page)
  expect(state.pages).toHaveLength(2)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
  expect(state.pages[1]?.title).toBe('Task 2')
  expect(state.pages[1]?.blocks.map((block) => block.id)).toEqual(['story:s2'])
})

test('newly broken-out page item keeps focus and accepts Enter/Tab/Shift+Tab', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  let state = await readState(page)
  expect(state.focusedBlockId).toBe('story:s2')

  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 7)
  await page.keyboard.press('Enter')

  state = await readState(page)
  expect(state.pages[1]?.blocks.length).toBe(2)
  const newId = state.pages[1]?.blocks[1]?.id
  expect(newId).toBeTruthy()

  await setCaret(page, newId!, 0)
  await page.keyboard.press('Tab')

  state = await readState(page)
  expect(state.pages[1]?.blocks.length).toBe(1)
  expect(state.pages[1]?.blocks[0]?.children.map((child) => child.id)).toContain(newId!)

  await setCaret(page, newId!, 0)
  await page.keyboard.press('Shift+Tab')

  state = await readState(page)
  expect(state.pages[1]?.blocks.length).toBe(2)
  expect(state.pages[1]?.blocks[1]?.id).toBe(newId)
})

test('newly broken-out item retains content after Tab then Shift+Tab', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Shift+Tab')

  let state = await readState(page)
  expect(state.pages[1]?.title).toBe('Task 2')
  expect(state.pages[1]?.blocks[0]?.content).toBe('Story 2')
  const page2Id = state.pages[1]?.id
  expect(page2Id).toBeTruthy()

  await setCaret(page, `page:${page2Id!}`, 0)
  await page.keyboard.press('Tab')

  state = await readState(page)
  const demoted = state.pages[0]?.blocks.find((block) => block.content === 'Task 2')
  expect(demoted?.content).toBe('Task 2')
  expect(demoted?.children.map((child) => child.id)).toEqual(['story:s2'])
  expect(demoted?.children[0]?.content).toBe('Story 2')

  await setCaret(page, demoted!.id, 0)
  await page.keyboard.press('Shift+Tab')

  state = await readState(page)
  expect(state.pages[1]?.title).toBe('Task 2')
  expect(state.pages[1]?.blocks.map((block) => block.id)).toEqual(['story:s2'])
  expect(state.pages[1]?.blocks[0]?.content).toBe('Story 2')
})

test('Enter on empty top-level block promotes it to a new page', async ({ page }) => {
  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Shift+Tab')

  await setBlockContent(page, 'story:s2', '')
  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  expect(state.pages).toHaveLength(2)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
  expect(state.pages[1]?.title).toBe('')
  expect(state.pages[1]?.blocks).toEqual([])
})

test('Shift+Tab outdents child block to page top-level', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Shift+Tab')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
  expect(state.pages[0]?.blocks[0]?.children).toEqual([])
})

test('Enter on empty nested block breaks out to page top-level', async ({ page }) => {
  await setBlockContent(page, 'story:s1', '')
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Enter')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
  expect(state.pages[0]?.blocks[0]?.children).toEqual([])
  expect(state.pages[0]?.blocks[1]?.content).toBe('')
})

test('Shift+Tab on empty nested block breaks out to page top-level', async ({ page }) => {
  await setBlockContent(page, 'story:s1', '')
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Shift+Tab')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
  expect(state.pages[0]?.blocks[0]?.children).toEqual([])
  expect(state.pages[0]?.blocks[1]?.content).toBe('')
})

test('Enter on child then Shift+Tab promotes new sibling to top-level', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 7)
  await page.keyboard.press('Enter')

  const afterSplit = await readState(page)
  const newChildId = afterSplit.pages[0]?.blocks[0]?.children[1]?.id
  expect(newChildId).toBeTruthy()

  await setCaret(page, newChildId!, 0)
  await page.keyboard.press('Shift+Tab')

  const state = await readState(page)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', newChildId!, 'task:t2'])
  expect(state.pages[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])
})

test('Tab then Shift+Tab round-trips a block to top-level without refocus', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)

  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')

  const state = await readState(page)
  expect(state.pages).toHaveLength(1)
  expect(state.pages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
})

test('moves blocks with Alt+ArrowUp and Alt+ArrowDown', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Alt+ArrowUp')

  let state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.id).toBe('task:t2')

  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Alt+ArrowDown')

  state = await readState(page)
  expect(state.pages[0]?.blocks[1]?.id).toBe('task:t2')
})

test('deletes empty block with Delete', async ({ page }) => {
  await page.click('#story\\:s2')
  await page.locator('#story\\:s2').evaluate((el) => {
    el.textContent = ''
  })
  await setCaret(page, 'story:s2', 0)
  await page.keyboard.press('Delete')

  const state = await readState(page)
  const remainingChildIds = state.pages[0]?.blocks.flatMap((block) => block.children.map((child) => child.id))
  expect(remainingChildIds).not.toContain('story:s2')
})

test('Delete on non-empty block does not trigger structural delete', async ({ page }) => {
  await page.click('#story\\:s2')
  await setCaret(page, 'story:s2', 2)
  await page.keyboard.press('Delete')

  const state = await readState(page)
  const remainingChildIds = state.pages[0]?.blocks.flatMap((block) => block.children.map((child) => child.id))
  expect(remainingChildIds).toContain('story:s2')
})

test('undo and redo keyboard shortcuts work across structural mutations', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 4)
  await page.keyboard.press('Enter')

  let state = await readState(page)
  expect(state.pages[0]?.blocks.length).toBe(3)

  await page.evaluate(() => {
    const editor = document.querySelector('.outliner-editor') as HTMLElement | null
    if (!editor) return
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
  })

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks.length)
    .toBe(2)

  await page.evaluate(() => {
    const editor = document.querySelector('.outliner-editor') as HTMLElement | null
    if (!editor) return
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))
  })

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks.length)
    .toBe(3)

  await page.evaluate(() => {
    const editor = document.querySelector('.outliner-editor') as HTMLElement | null
    if (!editor) return
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }))
  })

  await expect
    .poll(async () => (await readState(page)).pages[0]?.blocks.length)
    .toBe(3)
})

test('no-op structural keys do not leak caret marker span', async ({ page }) => {
  await page.click('#page\\:activity-1')
  await setCaret(page, 'page:activity-1', 0)

  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#__caret')).toHaveCount(0)

  await page.keyboard.press('Alt+ArrowUp')
  await expect(page.locator('#__caret')).toHaveCount(0)
})

test('focus callback tracks selected block under keyboard operations', async ({ page }) => {
  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 1)

  let state = await readState(page)
  expect(state.focusedBlockId).toBe('story:s1')

  await page.keyboard.press('Alt+ArrowDown')
  state = await readState(page)
  expect(state.focusedBlockId).toBe('story:s1')
})

test('supports Cmd/Ctrl+Shift+ArrowUp/Down as move aliases', async ({ page }) => {
  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Control+Shift+ArrowUp')

  let state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.id).toBe('task:t2')

  await page.click('#task\\:t2')
  await setCaret(page, 'task:t2', 0)
  await page.keyboard.press('Control+Shift+ArrowDown')

  state = await readState(page)
  expect(state.pages[0]?.blocks[1]?.id).toBe('task:t2')
})

test('supports Shift+ArrowUp/Down for block range selection', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Shift+ArrowDown')

  const selectedIds = await page.locator('.block[data-block-selected="true"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.blockId ?? ''),
  )
  expect(selectedIds).toContain('task:t1')
  expect(selectedIds).toContain('story:s1')
})

test('supports progressive Cmd/Ctrl+A selection (text, block, subtree/page)', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 1)

  await page.evaluate(() => {
    const editor = document.querySelector('.outliner-editor') as HTMLElement | null
    if (!editor) return
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
  })
  const firstSelected = await readSelectedText(page)

  await page.evaluate(() => {
    const editor = document.querySelector('.outliner-editor') as HTMLElement | null
    if (!editor) return
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
  })
  const thirdSelected = await readSelectedText(page)
  const selectedIds = await page.locator('.block[data-block-selected="true"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.blockId ?? ''),
  )

  expect(firstSelected).toContain('Task 1')
  expect(thirdSelected).toContain('Task 1')
  expect(selectedIds).toContain('story:s1')
})

test('supports ArrowLeft/ArrowRight at block start for collapse and expand', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#story\\:s1')).toHaveCount(0)

  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#story\\:s1')).toHaveCount(1)
})

test('supports Cmd/Ctrl+ArrowUp/Down and Cmd/Ctrl+. for collapse and expand', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Control+ArrowUp')
  await expect(page.locator('#story\\:s1')).toHaveCount(0)

  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Control+ArrowDown')
  await expect(page.locator('#story\\:s1')).toHaveCount(1)

  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 0)
  await page.keyboard.press('Control+.')
  await expect(page.locator('#story\\:s1')).toHaveCount(0)
})

test('supports ArrowUp/ArrowDown boundary navigation between blocks', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('ArrowDown')

  let state = await readState(page)
  expect(state.focusedBlockId).toBe('story:s1')

  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('ArrowUp')

  state = await readState(page)
  expect(state.focusedBlockId).toBe('task:t1')
})

test('supports Home/End progressive line/block navigation', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('End')

  let state = await readState(page)
  expect(state.focusedBlockId).toBe('story:s1')

  await page.click('#story\\:s1')
  await setCaret(page, 'story:s1', 0)
  await page.keyboard.press('Home')

  state = await readState(page)
  expect(state.focusedBlockId).toBe('task:t1')
})

test('supports Delete at end-of-block to merge with next block', async ({ page }) => {
  await page.click('#task\\:t1')
  await setCaret(page, 'task:t1', 6)
  await page.keyboard.press('Delete')

  const state = await readState(page)
  expect(state.pages[0]?.blocks[0]?.content).toBe('Task 1Story 1')
  expect(state.pages[0]?.blocks[0]?.children.map((child) => child.id)).not.toContain('story:s1')
})
