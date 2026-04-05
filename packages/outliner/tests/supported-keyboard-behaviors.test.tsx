/** @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ReactDOM from 'react-dom/client'
import Outliner from '../src'
import type { OutlinerPage } from '../src'

type MountedView = ReturnType<typeof mount>

function seedPages(): OutlinerPage[] {
  return [
    {
      id: 'a1',
      title: 'Activity 1',
      blocks: [
        {
          id: 'task:t1',
          content: 'Task 1',
          children: [{ id: 'story:s1', content: 'Story 1', children: [] }],
        },
        {
          id: 'task:t2',
          content: 'Task 2',
          children: [{ id: 'story:s2', content: 'Story 2', children: [] }],
        },
      ],
    },
  ]
}

function mount(pages = seedPages()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  const onPagesChange = vi.fn()
  const onBlockFocus = vi.fn()
  const onUndo = vi.fn()
  const onRedo = vi.fn()

  act(() => {
    root.render(
      <Outliner
        pages={pages}
        onPagesChange={onPagesChange}
        onBlockFocus={onBlockFocus}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo
        canRedo
      />,
    )
  })

  return {
    container,
    onPagesChange,
    onBlockFocus,
    onUndo,
    onRedo,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function selectorForId(id: string): string {
  return `#${id.replaceAll(':', '\\:')}`
}

function getBlock(view: MountedView, id: string): HTMLElement {
  const element = view.container.querySelector(selectorForId(id))
  if (!(element instanceof HTMLElement)) throw new Error(`Expected block ${id}`)
  return element
}

function latestPages(view: MountedView): OutlinerPage[] {
  const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[] | undefined
  if (!nextPages) throw new Error('Expected onPagesChange to be called')
  return nextPages
}

function setCaret(contentEl: HTMLElement, offset: number) {
  let node = contentEl.firstChild
  if (!node) {
    node = document.createTextNode('')
    contentEl.appendChild(node)
  }

  const selection = window.getSelection()
  if (!selection) throw new Error('Expected selection object')

  const range = document.createRange()
  const maxOffset = node.textContent?.length ?? 0
  range.setStart(node, Math.max(0, Math.min(offset, maxOffset)))
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function focusBlock(view: MountedView, id: string, offset: number): HTMLElement {
  const block = getBlock(view, id)
  setCaret(block, offset)

  act(() => {
    block.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })

  return block
}

function pressKey(view: MountedView, id: string, init: KeyboardEventInit): void {
  const block = getBlock(view, id)
  act(() => {
    block.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
  })
}

function commitText(view: MountedView, id: string, content: string, key = 'x'): void {
  const block = getBlock(view, id)
  block.textContent = content
  setCaret(block, content.length)

  act(() => {
    block.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
  })
}

describe('supported keyboard behaviors', () => {
  describe('undo and redo shortcuts', () => {
    it.each([
      { label: 'Cmd+Z', init: { key: 'z', metaKey: true }, undoCalls: 1, redoCalls: 0 },
      { label: 'Ctrl+Z', init: { key: 'z', ctrlKey: true }, undoCalls: 1, redoCalls: 0 },
      { label: 'Cmd+Y', init: { key: 'y', metaKey: true }, undoCalls: 0, redoCalls: 1 },
      { label: 'Ctrl+Y', init: { key: 'y', ctrlKey: true }, undoCalls: 0, redoCalls: 1 },
      { label: 'Cmd+Shift+Z', init: { key: 'z', metaKey: true, shiftKey: true }, undoCalls: 0, redoCalls: 1 },
      { label: 'Ctrl+Shift+Z', init: { key: 'z', ctrlKey: true, shiftKey: true }, undoCalls: 0, redoCalls: 1 },
    ])('dispatches $label', ({ init, undoCalls, redoCalls }) => {
      const view = mount()
      focusBlock(view, 'task:t1', 0)

      pressKey(view, 'task:t1', init)

      expect(view.onUndo).toHaveBeenCalledTimes(undoCalls)
      expect(view.onRedo).toHaveBeenCalledTimes(redoCalls)
      expect(view.onPagesChange).not.toHaveBeenCalled()
      view.cleanup()
    })
  })

  describe('Enter behaviors', () => {
    it('splits the current block at the caret', () => {
      const view = mount()
      focusBlock(view, 'task:t1', 4)

      pressKey(view, 'task:t1', { key: 'Enter' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.content)).toEqual(['Task', ' 1', 'Task 2'])
      view.cleanup()
    })

    it('Enter on an empty nested leaf outdents it one level', () => {
      const view = mount()
      commitText(view, 'story:s1', '')
      focusBlock(view, 'story:s1', 0)

      pressKey(view, 'story:s1', { key: 'Enter' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children).toEqual([])
      view.cleanup()
    })

    it('Enter on an empty top-level leaf promotes it into a new page item', () => {
      const pages = seedPages()
      pages[0]!.blocks[1]!.children[0]!.content = ''
      const view = mount(pages)
      focusBlock(view, 'story:s2', 0)
      pressKey(view, 'story:s2', { key: 'Tab', shiftKey: true })

      focusBlock(view, 'story:s2', 0)
      pressKey(view, 'story:s2', { key: 'Enter' })

      const nextPages = latestPages(view)
      expect(nextPages).toHaveLength(2)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
      expect(nextPages[1]?.title).toBe('')
      expect(nextPages[1]?.blocks).toEqual([])
      view.cleanup()
    })
  })

  describe('Backspace and Delete behaviors', () => {
    it('Backspace at caret start merges into the previous logical block', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'Backspace' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
      expect(nextPages[0]?.blocks[0]?.children[0]?.content).toBe('Story 1Task 2')
      expect(nextPages[0]?.blocks[0]?.children[0]?.children.map((block) => block.id)).toEqual(['story:s2'])
      view.cleanup()
    })

    it('Backspace on an empty nested block removes and merges instead of outdenting', () => {
      const view = mount()
      commitText(view, 'story:s1', '')
      focusBlock(view, 'story:s1', 0)

      pressKey(view, 'story:s1', { key: 'Backspace' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children).toEqual([])
      view.cleanup()
    })

    it('Delete removes the current block when it is empty', () => {
      const view = mount()
      commitText(view, 'story:s2', '')
      focusBlock(view, 'story:s2', 0)

      pressKey(view, 'story:s2', { key: 'Delete' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks[1]?.children).toEqual([])
      view.cleanup()
    })

    it('Delete at the end of a block merges it with the next logical block', () => {
      const view = mount()
      const task = focusBlock(view, 'task:t1', getBlock(view, 'task:t1').textContent?.length ?? 0)
      expect(task.textContent).toBe('Task 1')

      pressKey(view, 'task:t1', { key: 'Delete' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks[0]?.content).toBe('Task 1Story 1')
      expect(nextPages[0]?.blocks[0]?.children).toEqual([])
      view.cleanup()
    })
  })

  describe('Tab and Shift+Tab behaviors', () => {
    it('Tab indents the current block under the previous sibling', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'Tab' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
      expect(nextPages[0]?.blocks[0]?.children.map((block) => block.id)).toEqual(['story:s1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children[1]?.children.map((block) => block.id)).toEqual(['story:s2'])
      view.cleanup()
    })

    it('Tab on a page-level item indents it under the previous page-level line', () => {
      const view = mount()
      focusBlock(view, 'story:s1', 0)
      pressKey(view, 'story:s1', { key: 'Tab', shiftKey: true })

      focusBlock(view, 'story:s1', 0)
      pressKey(view, 'story:s1', { key: 'Tab' })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children.map((block) => block.id)).toEqual(['story:s1'])
      view.cleanup()
    })

    it('Shift+Tab outdents the current nested block', () => {
      const view = mount()
      focusBlock(view, 'story:s1', 0)

      pressKey(view, 'story:s1', { key: 'Tab', shiftKey: true })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children).toEqual([])
      view.cleanup()
    })

    it('Shift+Tab on a top-level block promotes it into a new page item', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'Tab', shiftKey: true })

      const nextPages = latestPages(view)
      expect(nextPages).toHaveLength(2)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
      expect(nextPages[1]?.title).toBe('Task 2')
      expect(nextPages[1]?.blocks.map((block) => block.id)).toEqual(['story:s2'])
      view.cleanup()
    })
  })

  describe('Option/Alt arrow behaviors', () => {
    it('Option/Alt+ArrowUp moves the current block up among siblings', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'ArrowUp', altKey: true })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t2', 'task:t1'])
      view.cleanup()
    })

    it('Option/Alt+ArrowDown moves the current block down among siblings', () => {
      const view = mount()
      focusBlock(view, 'task:t1', 0)

      pressKey(view, 'task:t1', { key: 'ArrowDown', altKey: true })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t2', 'task:t1'])
      view.cleanup()
    })

    it('Option/Alt+ArrowLeft outdents the current block', () => {
      const view = mount()
      focusBlock(view, 'story:s1', 0)

      pressKey(view, 'story:s1', { key: 'ArrowLeft', altKey: true })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
      expect(nextPages[0]?.blocks[0]?.children).toEqual([])
      view.cleanup()
    })

    it('Option/Alt+ArrowRight indents the current block', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'ArrowRight', altKey: true })

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
      expect(nextPages[0]?.blocks[0]?.children.map((block) => block.id)).toEqual(['story:s1', 'task:t2'])
      view.cleanup()
    })
  })

  describe('Cmd/Ctrl+Shift+Arrow aliases', () => {
    it.each([
      { label: 'Cmd+Shift+ArrowUp', id: 'task:t2', init: { key: 'ArrowUp', metaKey: true, shiftKey: true }, expected: ['task:t2', 'task:t1'] },
      { label: 'Ctrl+Shift+ArrowUp', id: 'task:t2', init: { key: 'ArrowUp', ctrlKey: true, shiftKey: true }, expected: ['task:t2', 'task:t1'] },
      { label: 'Cmd+Shift+ArrowDown', id: 'task:t1', init: { key: 'ArrowDown', metaKey: true, shiftKey: true }, expected: ['task:t2', 'task:t1'] },
      { label: 'Ctrl+Shift+ArrowDown', id: 'task:t1', init: { key: 'ArrowDown', ctrlKey: true, shiftKey: true }, expected: ['task:t2', 'task:t1'] },
    ])('supports $label as a move alias', ({ id, init, expected }) => {
      const view = mount()
      focusBlock(view, id, 0)

      pressKey(view, id, init)

      const nextPages = latestPages(view)
      expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(expected)
      view.cleanup()
    })
  })

  describe('invalid structural cases', () => {
    it('Backspace is a no-op at the start of the first top-level block', () => {
      const view = mount()
      focusBlock(view, 'task:t1', 0)

      pressKey(view, 'task:t1', { key: 'Backspace' })

      expect(view.onPagesChange).not.toHaveBeenCalled()
      view.cleanup()
    })

    it('Tab is a no-op for the first top-level block without a previous sibling', () => {
      const view = mount()
      focusBlock(view, 'task:t1', 0)

      pressKey(view, 'task:t1', { key: 'Tab' })

      expect(view.onPagesChange).not.toHaveBeenCalled()
      view.cleanup()
    })

    it('Option/Alt+ArrowDown is a no-op for the last sibling', () => {
      const view = mount()
      focusBlock(view, 'task:t2', 0)

      pressKey(view, 'task:t2', { key: 'ArrowDown', altKey: true })

      expect(view.onPagesChange).not.toHaveBeenCalled()
      view.cleanup()
    })
  })
})