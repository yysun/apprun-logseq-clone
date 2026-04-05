/** @vitest-environment jsdom */

import React, { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ReactDOM from 'react-dom/client'
import OutlinerLanes from '../src'
import type { OutlinerPage } from '../src'

function createPages(): OutlinerPage[] {
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

function mount(pages = createPages()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)

  const onPagesChange = vi.fn()
  const onBlockFocus = vi.fn()

  act(() => {
    root.render(
      <OutlinerLanes
        pages={pages}
        onPagesChange={onPagesChange}
        onBlockFocus={onBlockFocus}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo
        canRedo
      />,
    )
  })

  return {
    container,
    onPagesChange,
    onBlockFocus,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function setCaret(el: HTMLElement, offset: number) {
  let node = el.firstChild
  if (!node) {
    node = document.createTextNode('')
    el.appendChild(node)
  }

  const selection = window.getSelection()
  const range = document.createRange()
  range.setStart(node, Math.min(offset, node.textContent?.length ?? 0))
  range.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function setCaretAndSelectBlock(el: HTMLElement, offset: number) {
  setCaret(el, offset)
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

function readCaretOffsetWithin(el: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return -1
  const range = selection.getRangeAt(0)
  if (!el.contains(range.startContainer)) return -1

  const measurement = range.cloneRange()
  measurement.selectNodeContents(el)
  measurement.setEnd(range.startContainer, range.startOffset)
  return measurement.toString().length
}

function activeSelectionBlockId(): string | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const anchor = selection.anchorNode
  if (!anchor) return null
  const origin = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement
  if (!origin) return null
  const block = origin.closest('.block-content')
  return block instanceof HTMLElement ? block.id : null
}

describe('editor boundary behavior', () => {
  it('commits text edits on keyup for non-structural keys', () => {
    const view = mount()
    const task = view.container.querySelector('#task\\:t1') as HTMLElement

    act(() => {
      task.textContent = 'Task 1 updated'
      task.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }))
    })

    const nextPages = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    expect(nextPages[0].blocks[0]?.content).toBe('Task 1 updated')
    view.cleanup()
  })

  it('Backspace in middle of content does not trigger structural merge', () => {
    const view = mount()
    const task = view.container.querySelector('#task\\:t2') as HTMLElement
    setCaretAndSelectBlock(task, 2)

    act(() => {
      task.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    expect(view.onPagesChange).not.toHaveBeenCalled()
    view.cleanup()
  })

  it('Delete on non-empty content does not trigger structural delete', () => {
    const view = mount()
    const story = view.container.querySelector('#story\\:s2') as HTMLElement
    setCaretAndSelectBlock(story, 2)

    act(() => {
      story.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })

    expect(view.onPagesChange).not.toHaveBeenCalled()
    view.cleanup()
  })

  it('prunes removed collapsed ids after external pages update', () => {
    const initial = createPages()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)
    const onPagesChange = vi.fn()

    act(() => {
      root.render(
        <OutlinerLanes
          pages={initial}
          onPagesChange={onPagesChange}
          onBlockFocus={vi.fn()}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          canUndo
          canRedo
        />,
      )
    })

    const firstArrow = container.querySelector('.bullet-arrow') as HTMLElement
    act(() => {
      firstArrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const nextPages: OutlinerPage[] = [
      {
        id: 'new-a',
        title: 'New Activity',
        blocks: [{ id: 'task:new-t', content: 'New Task', children: [] }],
      },
    ]

    act(() => {
      root.render(
        <OutlinerLanes
          pages={nextPages}
          onPagesChange={onPagesChange}
          onBlockFocus={vi.fn()}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          canUndo
          canRedo
        />,
      )
    })

    expect(container.querySelector('#task\\:new-t')).not.toBeNull()

    act(() => root.unmount())
    container.remove()
  })

  it('keeps outliner selection after keyup causes parent update', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)

    function Harness() {
      const [pages, setPages] = React.useState<OutlinerPage[]>(createPages())
      const [sidebarRenders, setSidebarRenders] = React.useState(0)

      return (
        <div>
          <div data-testid="sidebar-renders">{sidebarRenders}</div>
          <OutlinerLanes
            pages={pages}
            onPagesChange={(nextPages) => {
              setPages(nextPages)
              setSidebarRenders((count) => count + 1)
            }}
            onBlockFocus={vi.fn()}
            onUndo={vi.fn()}
            onRedo={vi.fn()}
            canUndo
            canRedo
          />
        </div>
      )
    }

    act(() => {
      root.render(<Harness />)
    })

    const task = container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(task, 2)

    act(() => {
      task.textContent = 'Task 1 updated'
      task.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }))
    })

    expect(container.querySelector('[data-testid="sidebar-renders"]')?.textContent).toBe('1')
    expect(activeSelectionBlockId()).toBe('task:t1')
    expect(readCaretOffsetWithin(task)).toBeGreaterThanOrEqual(0)

    act(() => root.unmount())
    container.remove()
  })

  it('keeps caret on new line after Enter followed by immediate typing', () => {
    const view = mount()
    const firstTask = view.container.querySelector('#task\\:t1') as HTMLElement
    setCaretAndSelectBlock(firstTask, firstTask.textContent?.length ?? 0)

    act(() => {
      firstTask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const afterSplit = view.onPagesChange.mock.calls.at(-1)?.[0] as OutlinerPage[]
    const newBlockId = afterSplit[0]?.blocks[1]?.id
    expect(newBlockId).toBeTruthy()

    const newBlock = view.container.ownerDocument.getElementById(newBlockId!) as HTMLElement
    expect(newBlock).toBeTruthy()
    expect(activeSelectionBlockId()).toBe(newBlockId)

    act(() => {
      newBlock.textContent = 'x'
      newBlock.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }))
    })

    expect(activeSelectionBlockId()).toBe(newBlockId)
    expect(readCaretOffsetWithin(newBlock)).toBeGreaterThanOrEqual(0)
    view.cleanup()
  })
})
