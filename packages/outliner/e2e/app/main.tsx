import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Outliner from '../../src'
import '../../src/styles.css'
import './e2e.css'
import type { OutlinerBlock, OutlinerPage } from '../../src'

type E2EWindow = Window & {
  __outlinerE2E?: {
    setCaret: (blockId: string, offset: number) => boolean
    setBlockContent: (blockId: string, content: string) => boolean
  }
}

const INITIAL_PAGES: OutlinerPage[] = [
  {
    id: 'activity-1',
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

function clonePages(pages: OutlinerPage[]): OutlinerPage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => ({
      ...block,
      children: block.children.map((child) => ({ ...child })),
    })),
  }))
}

function setCaretByOffset(blockId: string, requestedOffset: number): boolean {
  const target = document.getElementById(blockId)
  if (!(target instanceof HTMLElement)) return false

  const selection = window.getSelection()
  if (!selection) return false

  const offset = Math.max(0, Math.min(requestedOffset, (target.textContent ?? '').length))
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let textNode: Node | null = null

  while (walker.nextNode()) {
    const node = walker.currentNode
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      textNode = node
      break
    }
    remaining -= len
  }

  const range = document.createRange()
  if (textNode) {
    range.setStart(textNode, remaining)
  } else {
    range.selectNodeContents(target)
    range.collapse(false)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  return true
}

function flattenBlockIds(pages: OutlinerPage[]): string[] {
  const ids: string[] = []
  const stack = pages.flatMap((page) => [`page:${page.id}`, ...page.blocks.map((block) => block.id)])
  ids.push(...stack)
  ids.push(...pages.flatMap((page) => page.blocks.flatMap((block) => block.children.map((child) => child.id))))
  return ids
}

function updateBlockContent(
  blocks: OutlinerBlock[],
  blockId: string,
  content: string,
): { blocks: OutlinerBlock[]; updated: boolean } {
  let updated = false
  const nextBlocks = blocks.map((block) => {
    if (block.id === blockId) {
      if (block.content !== content) updated = true
      return { ...block, content }
    }

    if (block.children.length === 0) return block

    let childUpdated = false
    const nextChildren = block.children.map((child) => {
      if (child.id !== blockId) return child
      if (child.content !== content) childUpdated = true
      return { ...child, content }
    })

    if (!childUpdated) return block
    updated = true
    return { ...block, children: nextChildren }
  })

  return { blocks: nextBlocks, updated }
}

function App() {
  const [pages, setPages] = useState<OutlinerPage[]>(() => clonePages(INITIAL_PAGES))
  const [focusedBlockId, setFocusedBlockId] = useState<string | undefined>(undefined)
  const [historyPast, setHistoryPast] = useState<OutlinerPage[][]>([])
  const [historyFuture, setHistoryFuture] = useState<OutlinerPage[][]>([])
  const pagesRef = useRef<OutlinerPage[]>(pages)

  useEffect(() => {
    pagesRef.current = pages
  }, [pages])

  useEffect(() => {
    ; (window as E2EWindow).__outlinerE2E = {
      setCaret: setCaretByOffset,
      setBlockContent: (blockId: string, content: string) => {
        let didUpdate = false
        const nextPages = pagesRef.current.map((page) => {
          const result = updateBlockContent(page.blocks, blockId, content)
          if (!result.updated) return page
          didUpdate = true
          return { ...page, blocks: result.blocks }
        })

        if (didUpdate) setPages(nextPages)
        return didUpdate
      },
    }

    return () => {
      delete (window as E2EWindow).__outlinerE2E
    }
  }, [])

  function applyPages(next: OutlinerPage[]) {
    setHistoryPast((previous) => [...previous, pages])
    setHistoryFuture([])
    setPages(next)
  }

  function undo() {
    setHistoryPast((previousPast) => {
      if (previousPast.length === 0) return previousPast
      const nextPast = [...previousPast]
      const previousState = nextPast.pop()
      if (!previousState) return previousPast
      setHistoryFuture((previousFuture) => [pages, ...previousFuture])
      setPages(previousState)
      return nextPast
    })
  }

  function redo() {
    setHistoryFuture((previousFuture) => {
      if (previousFuture.length === 0) return previousFuture
      const [nextState, ...remaining] = previousFuture
      setHistoryPast((previousPast) => [...previousPast, pages])
      setPages(nextState)
      return remaining
    })
  }

  const stateDump = useMemo(
    () => ({ pages, focusedBlockId, history: { past: historyPast.length, future: historyFuture.length }, ids: flattenBlockIds(pages) }),
    [pages, focusedBlockId, historyPast.length, historyFuture.length],
  )

  return (
    <div>
      <Outliner
        pages={pages}
        onPagesChange={applyPages}
        onBlockFocus={setFocusedBlockId}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
      />
      <pre data-testid="state">{JSON.stringify(stateDump)}</pre>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
