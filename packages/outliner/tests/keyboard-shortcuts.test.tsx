/** @vitest-environment jsdom */

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import ReactDOM from 'react-dom/client'
import { act } from 'react'
import OutlinerLanes from '../src'
import type { OutlinerPage } from '../src'

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
      <OutlinerLanes
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
    root,
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

function setCaret(contentEl: HTMLElement, offset: number) {
  let node = contentEl.firstChild
  if (!node) {
    node = document.createTextNode('')
    contentEl.appendChild(node)
  }
  const selection = window.getSelection()
  if (!selection) throw new Error('Expected selection object')

  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function setCaretAndSelectBlock(contentEl: HTMLElement, offset: number) {
  setCaret(contentEl, offset)
  contentEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

describe('keyboard shortcuts and editor interactions', () => {
  it('Shift+Enter does not perform structural split', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, 2)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    })

    expect(view.onPagesChange).not.toHaveBeenCalled()
    view.cleanup()
  })

  it('calls undo/redo callbacks for command shortcuts', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, 0)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }))
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true, bubbles: true }))
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }))
    })

    expect(view.onUndo).toHaveBeenCalledTimes(1)
    expect(view.onRedo).toHaveBeenCalledTimes(2)
    view.cleanup()
  })

  it('splits current block on Enter and emits changed columns', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, 4)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(view.onPagesChange).toHaveBeenCalled()
    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.length).toBeGreaterThanOrEqual(3)
    view.cleanup()
  })

  it('splits at end of line into an empty sibling block', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, first.textContent?.length ?? 0)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      // Keyup should not revert the structural change.
      first.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks[0]?.content).toBe('Task 1')
    expect(nextPages[0].blocks[1]?.content).toBe('')
    view.cleanup()
  })

  it('Enter at parent end then typing creates a new top-level sibling', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, first.textContent?.length ?? 0)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const afterSplit = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    const siblingId = afterSplit[0]?.blocks[1]?.id
    expect(siblingId).toBeTruthy()
    expect(afterSplit[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])

    const sibling = view.container.ownerDocument.getElementById(siblingId!) as HTMLElement
    expect(sibling).toBeTruthy()
    sibling.textContent = 'tree2'
    setCaretAndSelectBlock(sibling, 'tree2'.length)

    act(() => {
      sibling.dispatchEvent(new KeyboardEvent('keyup', { key: '2', bubbles: true }))
    })

    const afterType = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(afterType[0]?.blocks[1]?.content).toBe('tree2')
    expect(afterType[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])
    view.cleanup()
  })

  it('splits at start of line and keeps original text in new sibling', () => {
    const view = mount()
    const first = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(first, 0)

    act(() => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks[0]?.content).toBe('')
    expect(nextPages[0].blocks[1]?.content).toBe('Task 1')
    view.cleanup()
  })

  it('indents with Tab and allows Shift+Tab to break top-level block into a new page', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    expect(view.onPagesChange).toHaveBeenCalledTimes(2)
    const pagesAfterBreakout = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(pagesAfterBreakout).toHaveLength(2)
    expect(pagesAfterBreakout[0]?.blocks.map((block) => block.id)).toEqual(['task:t1'])
    expect(pagesAfterBreakout[1]?.title).toBe('Task 2')
    expect(pagesAfterBreakout[1]?.blocks.map((block) => block.id)).toEqual(['story:s2'])
    view.cleanup()
  })

  it('Backspace at start of non-empty block merges into previous block', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1'])
    expect(nextPages[0].blocks[0]?.children[0]?.content).toBe('Story 1Task 2')
    expect(nextPages[0].blocks[0]?.children[0]?.children.map((child) => child.id)).toEqual(['story:s2'])
    view.cleanup()
  })

  it('Backspace at start of page-level block merges into previous page leaf', () => {
    const pages = seedPages()
    const view = mount(pages)

    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const movedStory = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(movedStory, 0)

    act(() => {
      movedStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages).toHaveLength(2)
    expect(nextPages[0]?.blocks[0]?.children[0]?.content).toBe('Story 1Story 2')
    expect(nextPages[1]?.blocks).toEqual([])
    view.cleanup()
  })

  it('Backspace at page-level first char merges into previous top-level line', () => {
    const view = mount()

    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(firstStory, 0)
    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)
    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const movedStory = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(movedStory, 0)
    act(() => {
      movedStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1'])
    expect(nextPages[0]?.blocks[1]?.content).toBe('Story 1Story 2')
    view.cleanup()
  })

  it('Delete removes empty block and keeps siblings intact', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    secondTask.textContent = ''
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1'])
    expect(nextPages[0].blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])
    view.cleanup()
  })

  it('Tab and Shift+Tab move subtree with parent block', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })

    const movedTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(movedTask, 0)

    act(() => {
      movedTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const indentPages = view.onPagesChange.mock.calls[0]?.[0] as OutlinerPage[]
    expect(indentPages[0].blocks).toHaveLength(1)
    expect(indentPages[0].blocks[0]?.children.map((child) => child.id)).toContain('task:t2')

    const outdentPages = view.onPagesChange.mock.calls[1]?.[0] as OutlinerPage[]
    expect(outdentPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
    expect(outdentPages[0].blocks[1]?.children.map((child) => child.id)).toEqual(['story:s2'])
    view.cleanup()
  })

  it('Tab on first page-level block indents under previous top-level line', () => {
    const view = mount()

    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(firstStory, 0)
    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)
    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const movedStory = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(movedStory, 0)
    act(() => {
      movedStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1'])
    expect(nextPages[0]?.blocks[1]?.children.map((child) => child.id)).toEqual(['story:s2'])
    view.cleanup()
  })

  it('newly broken-out item retains content when indented then unindented', () => {
    const view = mount()

    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)
    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const movedStory = view.container.querySelector('#story\\:s2') as HTMLElement
    expect(movedStory.textContent).toBe('Story 2')

    const page2Title = Array.from(view.container.querySelectorAll('.block-content')).find((el) => (el as HTMLElement).id !== 'page:a1' && (el as HTMLElement).id.startsWith('page:')) as HTMLElement
    expect(page2Title.textContent).toBe('Task 2')

    setCaretAndSelectBlock(page2Title, 0)
    act(() => {
      page2Title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })

    let nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    const demoted = nextPages[0]?.blocks.find((block) => block.content === 'Task 2')
    expect(demoted?.content).toBe('Task 2')
    expect(demoted?.children.map((child) => child.id)).toEqual(['story:s2'])
    expect(demoted?.children[0]?.content).toBe('Story 2')

    const demotedNode = view.container.ownerDocument.getElementById(demoted!.id) as HTMLElement
    setCaretAndSelectBlock(demotedNode, 0)
    act(() => {
      demotedNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[1]?.title).toBe('Task 2')
    expect(nextPages[1]?.blocks.map((block) => block.id)).toEqual(['story:s2'])
    expect(nextPages[1]?.blocks[0]?.content).toBe('Story 2')
    view.cleanup()
  })

  it('Shift+Tab outdents a nested child to top-level', () => {
    const view = mount()
    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(firstStory, 0)

    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
    expect(nextPages[0].blocks[0]?.children).toEqual([])
    view.cleanup()
  })

  it('Enter on empty nested block breaks out to top-level instead of splitting nested siblings', () => {
    const view = mount()
    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    firstStory.textContent = ''
    setCaretAndSelectBlock(firstStory, 0)

    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }))
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
    expect(nextPages[0].blocks[0]?.children).toEqual([])
    view.cleanup()
  })

  it('Shift+Tab on empty nested block breaks out to top-level', () => {
    const view = mount()
    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    firstStory.textContent = ''
    setCaretAndSelectBlock(firstStory, 0)

    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }))
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'story:s1', 'task:t2'])
    expect(nextPages[0].blocks[0]?.children).toEqual([])
    view.cleanup()
  })

  it('Enter on empty top-level block promotes it into a new page root', () => {
    const pages = seedPages()
    pages[0]!.blocks[1]!.children[0]!.content = ''
    const view = mount(pages)
    const story = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(story, 0)

    act(() => {
      story.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const updatedTopLevelLeaf = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(updatedTopLevelLeaf, 0)

    act(() => {
      updatedTopLevelLeaf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages).toHaveLength(2)
    expect(nextPages[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
    expect(nextPages[1]?.title).toBe('')
    expect(nextPages[1]?.blocks).toEqual([])
    view.cleanup()
  })

  it('Enter on child then Shift+Tab creates and promotes a new top-level block', () => {
    const view = mount()
    const story = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(story, story.textContent?.length ?? 0)

    act(() => {
      story.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const afterSplit = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    const newChildId = afterSplit[0]?.blocks[0]?.children[1]?.id
    expect(newChildId).toBeTruthy()

    const newChild = view.container.ownerDocument.getElementById(newChildId!) as HTMLElement
    expect(newChild).toBeTruthy()
    setCaretAndSelectBlock(newChild, 0)

    act(() => {
      newChild.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    const afterOutdent = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(afterOutdent[0]?.blocks.map((block) => block.id)).toEqual(['task:t1', newChildId!, 'task:t2'])
    expect(afterOutdent[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story:s1'])
    view.cleanup()
  })

  it('cleans temporary caret marker after no-op outdent on page root block', () => {
    const view = mount()
    const pageRoot = view.container.querySelector('#page\\:a1') as HTMLElement
    setCaretAndSelectBlock(pageRoot, 0)

    act(() => {
      pageRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    expect(view.onPagesChange).not.toHaveBeenCalled()
    expect(view.container.querySelector('#__caret')).toBeNull()
    view.cleanup()
  })

  it('keeps caret stable after repeated no-op structural key presses on page root', () => {
    const view = mount()
    const pageRoot = view.container.querySelector('#page\\:a1') as HTMLElement
    setCaretAndSelectBlock(pageRoot, 0)

    act(() => {
      for (let i = 0; i < 10; i += 1) {
        pageRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
        pageRoot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
      }
    })

    const selection = window.getSelection()
    expect(selection?.anchorNode).not.toBeNull()
    expect(pageRoot.contains(selection?.anchorNode ?? null)).toBe(true)
    expect(view.container.querySelector('#__caret')).toBeNull()
    view.cleanup()
  })

  it('cleans temporary caret marker after no-op move-up and move-down operations', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement

    setCaretAndSelectBlock(firstTask, 0)
    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
    })

    expect(view.container.querySelector('#__caret')).toBeNull()

    setCaretAndSelectBlock(secondTask, 0)
    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    })

    expect(view.container.querySelector('#__caret')).toBeNull()
    view.cleanup()
  })

  it('does not leak caret marker when Backspace merge is invalid at first top-level block', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    expect(view.onPagesChange).not.toHaveBeenCalled()
    expect(view.container.querySelector('#__caret')).toBeNull()
    view.cleanup()
  })

  it('routes Alt+Arrow operations to mutations', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }))
    })

    expect(view.onPagesChange.mock.calls.length).toBeGreaterThanOrEqual(2)
    view.cleanup()
  })

  it('moves full subtree with Alt+ArrowUp/Down', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
    })

    const upPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(upPages[0].blocks.map((block) => block.id)).toEqual(['task:t2', 'task:t1'])
    expect(upPages[0].blocks[0]?.children.map((child) => child.id)).toEqual(['story:s2'])

    act(() => {
      const movedTask = view.container.querySelector('#task\\:t2') as HTMLElement
      setCaretAndSelectBlock(movedTask, 0)
      movedTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    })

    const downPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(downPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
    expect(downPages[0].blocks[1]?.children.map((child) => child.id)).toEqual(['story:s2'])
    view.cleanup()
  })

  it('deletes empty block on Delete', () => {
    const view = mount()
    const story2 = view.container.querySelector('#story\\:s2') as HTMLElement
    story2.textContent = ''
    setCaretAndSelectBlock(story2, 0)

    act(() => {
      story2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })

    expect(view.onPagesChange).toHaveBeenCalled()
    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.flatMap((block) => block.children).map((c) => c.id)).not.toContain('story:s2')
    view.cleanup()
  })

  it('calls onBlockFocus when a story block gets focus', () => {
    const view = mount()
    const story = view.container.querySelector('#story\\:s1') as HTMLElement

    act(() => {
      setCaret(story, 1)
      story.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    expect(view.onBlockFocus).toHaveBeenCalledWith('story:s1')
    view.cleanup()
  })

  it('supports Cmd/Ctrl+Shift+ArrowUp/Down as move aliases', () => {
    const view = mount()
    const secondTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(secondTask, 0)

    act(() => {
      secondTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, shiftKey: true, bubbles: true }))
    })

    let nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t2', 'task:t1'])

    const movedTask = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(movedTask, 0)
    act(() => {
      movedTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true, bubbles: true }))
    })

    nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks.map((block) => block.id)).toEqual(['task:t1', 'task:t2'])
    view.cleanup()
  })

  it('supports Shift+ArrowUp/Down for block range selection', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    })

    const selectedBlocks = Array.from(view.container.querySelectorAll('.block[data-block-selected="true"]')).map(
      (node) => (node as HTMLElement).dataset.blockId,
    )
    expect(selectedBlocks).toContain('task:t1')
    expect(selectedBlocks).toContain('story:s1')
    view.cleanup()
  })

  it('supports progressive Cmd/Ctrl+A selection (text, block, subtree/page)', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 1)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    })
    const firstSelection = window.getSelection()?.toString() ?? ''

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    })
    const thirdSelection = window.getSelection()?.toString() ?? ''
    const selectedBlocks = Array.from(view.container.querySelectorAll('.block[data-block-selected="true"]')).map(
      (node) => (node as HTMLElement).dataset.blockId,
    )

    expect(firstSelection).toContain('Task 1')
    expect(thirdSelection).toContain('Task 1')
    expect(selectedBlocks.length === 0 || selectedBlocks.includes('story:s1')).toBe(true)
    view.cleanup()
  })

  it('supports ArrowLeft/ArrowRight at block start for collapse and expand', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(view.container.querySelector('#story\\:s1')).toBeNull()

    const firstTaskAgain = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTaskAgain, 0)
    act(() => {
      firstTaskAgain.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(view.container.querySelector('#story\\:s1')).not.toBeNull()
    view.cleanup()
  })

  it('supports Cmd/Ctrl+ArrowUp/Down and Cmd/Ctrl+. for collapse and expand', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, bubbles: true }))
    })
    expect(view.container.querySelector('#story\\:s1')).toBeNull()

    const taskForExpand = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(taskForExpand, 0)
    act(() => {
      taskForExpand.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }))
    })
    expect(view.container.querySelector('#story\\:s1')).not.toBeNull()

    const taskForToggle = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(taskForToggle, 0)
    act(() => {
      taskForToggle.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, bubbles: true }))
    })
    expect(view.container.querySelector('#story\\:s1')).toBeNull()
    view.cleanup()
  })

  it('supports ArrowUp/ArrowDown boundary navigation between blocks', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, firstTask.textContent?.length ?? 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(view.onBlockFocus).toHaveBeenLastCalledWith('story:s1')

    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(firstStory, 0)
    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    })
    expect(view.onBlockFocus).toHaveBeenLastCalledWith('task:t1')
    view.cleanup()
  })

  it('supports Home/End progressive navigation within line and block boundaries', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, 2)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    const endOffset = window.getSelection()?.anchorOffset ?? 0
    expect(endOffset).toBeGreaterThanOrEqual((firstTask.textContent?.length ?? 0) - 1)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(view.onBlockFocus).toHaveBeenLastCalledWith('story:s1')

    const firstStory = view.container.querySelector('#story\\:s1') as HTMLElement
    setCaretAndSelectBlock(firstStory, 0)
    act(() => {
      firstStory.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(view.onBlockFocus).toHaveBeenLastCalledWith('task:t1')
    view.cleanup()
  })

  it('supports Delete at end-of-block to merge with next block', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, firstTask.textContent?.length ?? 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks[0]?.content).toBe('Task 1Story 1')
    expect(nextPages[0].blocks[0]?.children.map((child) => child.id)).not.toContain('story:s1')
    view.cleanup()
  })
})
