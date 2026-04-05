import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { OutlinerBlock, OutlinerPage, OutlinerProps } from './types'

type Block = {
  id: string
  content: string
  children: Block[]
  isPageRoot?: boolean
  pageId?: string
}

type BlockLocation = {
  block: Block
  siblings: Block[]
  index: number
  parent?: Block
  parentSiblings?: Block[]
  parentIndex?: number
}

type MutationResult = {
  blocks: Block[]
  focusId?: string
  placeCaretAtStart?: boolean
  caretOffset?: number
}

type CaretSnapshot = {
  blockId: string
  offset: number
}

const CARET_ID = '__caret'

function cloneBlock(block: Block): Block {
  return {
    ...block,
    children: block.children.map(cloneBlock),
  }
}

function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map(cloneBlock)
}

function toInternalBlock(block: OutlinerBlock): Block {
  return {
    id: block.id,
    content: block.content,
    children: block.children.map(toInternalBlock),
  }
}

function toOutlinerBlock(block: Block): OutlinerBlock {
  return {
    id: block.id,
    content: block.content,
    children: block.children.map(toOutlinerBlock),
  }
}

function pagesToBlocks(pages: OutlinerPage[]): Block[] {
  return pages.map((page) => ({
    id: `page:${page.id}`,
    pageId: page.id,
    isPageRoot: true,
    content: page.title,
    children: page.blocks.map(toInternalBlock),
  }))
}

function blocksToPages(blocks: Block[]): OutlinerPage[] {
  return blocks
    .filter((block) => block.isPageRoot)
    .map((pageRoot) => ({
      id: pageRoot.pageId ?? pageRoot.id.replace(/^page:/, ''),
      title: pageRoot.content,
      blocks: pageRoot.children.map(toOutlinerBlock),
    }))
}

function flattenBlockIds(blocks: Block[]): string[] {
  const output: string[] = []
  const stack = [...blocks].reverse()

  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    output.push(node.id)
    for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push(node.children[i])
  }

  return output
}

function findPrevBlock(blocks: Block[], id: string): string | null {
  const ids = flattenBlockIds(blocks)
  const index = ids.indexOf(id)
  if (index <= 0) return null
  return ids[index - 1]
}

function findNextBlock(blocks: Block[], id: string): string | null {
  const ids = flattenBlockIds(blocks)
  const index = ids.indexOf(id)
  if (index < 0 || index >= ids.length - 1) return null
  return ids[index + 1]
}

function findPrevNonPageBlock(blocks: Block[], id: string): string | null {
  const ids = flattenBlockIds(blocks)
  const index = ids.indexOf(id)
  if (index <= 0) return null

  for (let i = index - 1; i >= 0; i -= 1) {
    const candidateId = ids[i]
    if (!candidateId) continue
    const location = findBlockLocation(blocks, candidateId)
    if (location && !location.block.isPageRoot) return candidateId
  }

  return null
}

function compareBlockOrder(blocks: Block[], a: string, b: string): number {
  const ids = flattenBlockIds(blocks)
  return ids.indexOf(a) - ids.indexOf(b)
}

function findBlockLocation(blocks: Block[], id: string): BlockLocation | null {
  function search(siblings: Block[], parent?: Block, parentSiblings?: Block[], parentIndex?: number): BlockLocation | null {
    for (let index = 0; index < siblings.length; index += 1) {
      const block = siblings[index]
      if (block.id === id) return { block, siblings, index, parent, parentSiblings, parentIndex }
      const nested = search(block.children, block, siblings, index)
      if (nested) return nested
    }
    return null
  }

  return search(blocks)
}

function findAncestorIds(blocks: Block[], id: string): string[] {
  const location = findBlockLocation(blocks, id)
  const ancestors: string[] = []
  let parent = location?.parent

  while (parent) {
    ancestors.unshift(parent.id)
    const parentLocation = findBlockLocation(blocks, parent.id)
    parent = parentLocation?.parent
  }

  return ancestors
}

function createSiblingBlock(source: Block, idFactory: () => string, content = ''): Block {
  const siblingId = idFactory()
  if (source.isPageRoot) {
    return {
      id: siblingId,
      pageId: siblingId.replace(/^page:/, ''),
      isPageRoot: true,
      content,
      children: [],
    }
  }

  return {
    id: siblingId,
    content,
    children: [],
  }
}

function setBlockContent(blocks: Block[], id: string, content: string): Block[] {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location) return blocks
  if (location.block.content === content) return blocks
  location.block.content = content
  return draft
}

function splitBlock(blocks: Block[], id: string, before: string, after: string, idFactory: () => string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location) return { blocks }

  location.block.content = before
  const sibling = createSiblingBlock(location.block, idFactory, after)
  location.siblings.splice(location.index + 1, 0, sibling)
  return { blocks: draft, focusId: sibling.id, placeCaretAtStart: true }
}

function mergeBlock(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location) return { blocks }

  if (location.block.isPageRoot) {
    if (location.index === 0) return { blocks }
    const previous = location.siblings[location.index - 1]
    if (!previous || !previous.isPageRoot) return { blocks }

    const caretOffset = previous.content.length
    previous.content = `${previous.content}${location.block.content}`
    previous.children.push(...location.block.children)
    location.siblings.splice(location.index, 1)
    return { blocks: draft, focusId: previous.id, placeCaretAtStart: false, caretOffset }
  }

  const prevId = findPrevNonPageBlock(draft, id)
  if (!prevId) return { blocks }

  const prev = findBlockLocation(draft, prevId)
  if (!prev || prev.block.isPageRoot) return { blocks }

  const caretOffset = prev.block.content.length
  prev.block.content = `${prev.block.content}${location.block.content}`
  prev.block.children.push(...location.block.children)
  location.siblings.splice(location.index, 1)
  return { blocks: draft, focusId: prev.block.id, placeCaretAtStart: false, caretOffset }
}

function indentBlock(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.block.isPageRoot) return { blocks }

  if (location.index === 0) {
    if (!location.parent?.isPageRoot) return { blocks }
    const prevId = findPrevNonPageBlock(draft, id)
    if (!prevId) return { blocks }

    const prev = findBlockLocation(draft, prevId)
    if (!prev || prev.block.isPageRoot) return { blocks }

    const [node] = location.siblings.splice(location.index, 1)
    if (!node) return { blocks }
    prev.block.children.push(node)
    return { blocks: draft, focusId: node.id, placeCaretAtStart: false }
  }

  const previous = location.siblings[location.index - 1]
  const [node] = location.siblings.splice(location.index, 1)
  if (!node) return { blocks }
  previous.children.push(node)
  return { blocks: draft, focusId: node.id, placeCaretAtStart: false }
}

function indentPageRoot(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || !location.block.isPageRoot || location.index === 0) return { blocks }

  const previous = location.siblings[location.index - 1]
  if (!previous || !previous.isPageRoot) return { blocks }

  const [node] = location.siblings.splice(location.index, 1)
  if (!node) return { blocks }

  const demoted: Block = {
    id: node.id,
    content: node.content,
    children: node.children,
  }

  previous.children.push(demoted)
  return { blocks: draft, focusId: demoted.id, placeCaretAtStart: false }
}

function outdentBlock(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.block.isPageRoot || !location.parent || !location.parentSiblings || location.parentIndex === undefined) return { blocks }
  if (location.parent.isPageRoot) return { blocks }

  const [node] = location.siblings.splice(location.index, 1)
  if (!node) return { blocks }
  location.parentSiblings.splice(location.parentIndex + 1, 0, node)
  return { blocks: draft, focusId: node.id, placeCaretAtStart: false }
}

function promoteBlockToNewPage(blocks: Block[], id: string, idFactory: () => string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.block.isPageRoot || !location.parent || !location.parentSiblings || location.parentIndex === undefined) return { blocks }
  if (!location.parent.isPageRoot) return { blocks }

  const [node] = location.siblings.splice(location.index, 1)
  if (!node) return { blocks }

  const pageId = idFactory()
  const newPage: Block = {
    id: `page:${pageId}`,
    pageId,
    isPageRoot: true,
    content: node.content,
    children: node.children,
  }

  location.parentSiblings.splice(location.parentIndex + 1, 0, newPage)
  return { blocks: draft, focusId: newPage.children[0]?.id ?? newPage.id, placeCaretAtStart: false }
}

function moveBlockUp(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.index === 0) return { blocks }

  const prev = location.siblings[location.index - 1]
  location.siblings[location.index - 1] = location.block
  location.siblings[location.index] = prev
  return { blocks: draft, focusId: location.block.id, placeCaretAtStart: false }
}

function moveBlockDown(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.index >= location.siblings.length - 1) return { blocks }

  const next = location.siblings[location.index + 1]
  location.siblings[location.index + 1] = location.block
  location.siblings[location.index] = next
  return { blocks: draft, focusId: location.block.id, placeCaretAtStart: false }
}

function deleteBlock(blocks: Block[], id: string): MutationResult {
  const draft = cloneBlocks(blocks)
  const location = findBlockLocation(draft, id)
  if (!location || location.block.isPageRoot) return { blocks }

  const focusId = findPrevBlock(draft, id) ?? findNextBlock(draft, id) ?? undefined
  location.siblings.splice(location.index, 1)
  return { blocks: draft, focusId, placeCaretAtStart: false }
}

function mergeBlockWithNext(blocks: Block[], id: string): MutationResult {
  const nextId = findNextBlock(blocks, id)
  if (!nextId) return { blocks }
  const merged = mergeBlock(blocks, nextId)
  if (merged.blocks === blocks) return merged
  return { ...merged, focusId: id, placeCaretAtStart: false }
}

function getActiveContentElement(editorElement: HTMLElement): HTMLElement | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const anchor = selection.anchorNode
  if (!anchor) return null

  const origin = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement
  if (!origin) return null

  const contentElement = origin.closest('.block-content')
  if (!(contentElement instanceof HTMLElement)) return null
  if (!editorElement.contains(contentElement)) return null
  return contentElement
}

function getCaretTextOffset(el: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0
  const range = selection.getRangeAt(0)
  if (!el.contains(range.startContainer)) return 0

  const measurement = range.cloneRange()
  measurement.selectNodeContents(el)
  measurement.setEnd(range.startContainer, range.startOffset)
  return measurement.toString().length
}

function saveCaret(el: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0)
  if (!el.contains(range.startContainer)) return false

  const existing = el.querySelector(`#${CARET_ID}`)
  if (existing) existing.remove()

  const marker = document.createElement('span')
  marker.id = CARET_ID
  marker.setAttribute('aria-hidden', 'true')
  marker.style.display = 'inline-block'
  marker.style.width = '0'
  marker.style.height = '0'
  marker.style.overflow = 'hidden'

  range.insertNode(marker)
  range.setStartAfter(marker)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

function restoreCaret(el: HTMLElement): boolean {
  const marker = el.querySelector(`#${CARET_ID}`)
  if (!(marker instanceof HTMLElement)) return false

  const selection = window.getSelection()
  if (!selection) return false

  const range = document.createRange()
  range.setStartAfter(marker)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  marker.remove()
  return true
}

function clearSavedCaret(el: HTMLElement): void {
  const marker = el.querySelector(`#${CARET_ID}`)
  if (marker instanceof HTMLElement) marker.remove()
}

function createCaret(el: HTMLElement, toStart = false): void {
  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(toStart)
  selection.removeAllRanges()
  selection.addRange(range)
}

function setCaretOffset(el: HTMLElement, requestedOffset: number): boolean {
  const selection = window.getSelection()
  if (!selection) return false

  const text = el.textContent ?? ''
  const offset = Math.max(0, Math.min(requestedOffset, text.length))
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
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
    range.selectNodeContents(el)
    range.collapse(false)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

function splitElement(el: HTMLElement): [string, string] {
  const full = el.textContent ?? ''
  const offset = getCaretTextOffset(el)
  return [full.slice(0, offset), full.slice(offset)]
}

function getVisibleContentElements(editorElement: HTMLElement): HTMLElement[] {
  return Array.from(editorElement.querySelectorAll('.block-content')).filter((node): node is HTMLElement => node instanceof HTMLElement)
}

function firstTextNode(el: HTMLElement): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  return walker.nextNode() as Text | null
}

function lastTextNode(el: HTMLElement): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let last: Text | null = null
  while (walker.nextNode()) last = walker.currentNode as Text
  return last
}

function getAdjacentVisibleContent(editorElement: HTMLElement, blockId: string, direction: 'prev' | 'next'): HTMLElement | null {
  const blocks = getVisibleContentElements(editorElement)
  const index = blocks.findIndex((node) => node.id === blockId)
  if (index < 0) return null
  const nextIndex = direction === 'prev' ? index - 1 : index + 1
  return blocks[nextIndex] ?? null
}

type BlockViewProps = {
  blocks: Block[]
  collapsed: Set<string>
  onToggleCollapse: (id: string) => void
}

function BlockView({ blocks, collapsed, onToggleCollapse }: BlockViewProps) {
  return (
    <>
      {blocks.map((block) => {
        const isCollapsed = collapsed.has(block.id)
        const hasChildren = block.children.length > 0

        return (
          <div key={block.id} className="block" data-block-id={block.id}>
            <div className="block-header" contentEditable={false}>
              <button
                type="button"
                className="bullet-arrow"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onToggleCollapse(block.id)}
                aria-label={hasChildren ? `Toggle ${block.content || '(empty)'}` : 'No children'}
                disabled={!hasChildren}
              >
                <span className={isCollapsed ? 'arrow-right' : 'arrow-down'} />
              </button>
              <span className="bullet" aria-hidden="true" />
              <div
                id={block.id}
                className="block-content"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label={block.isPageRoot ? 'page title block' : 'block'}
              >
                {block.content}
              </div>
            </div>

            {hasChildren && !isCollapsed ? (
              <div className="block-list">
                <BlockView blocks={block.children} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

type OutlinerEditorProps = {
  blocks: Block[]
  collapsed: Set<string>
  editorRef: RefObject<HTMLDivElement>
  onBlocksChange: (next: Block[], preserveCaret?: boolean, skipLocalStateUpdate?: boolean) => void
  onBlocksMutate: (result: MutationResult) => void
  onToggleCollapse: (id: string) => void
  onBlockFocus?: (blockId?: string) => void
  onUndo: () => void
  onRedo: () => void
  createId: () => string
}

function OutlinerEditor({ blocks, collapsed, editorRef, onBlocksChange, onBlocksMutate, onToggleCollapse, onBlockFocus, onUndo, onRedo, createId }: OutlinerEditorProps) {
  const selectAllStateRef = useRef<{ blockId?: string; stage: number; timestamp: number }>({ stage: 0, timestamp: 0 })
  const blockRangeSelectionRef = useRef<{ anchorId?: string; extentId?: string }>({})

  function applyBlockSelection(editorElement: HTMLElement, ids: string[]): void {
    const selected = new Set(ids)
    const nodes = Array.from(editorElement.querySelectorAll('.block[data-block-id]'))
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      const blockId = node.dataset.blockId
      if (!blockId) continue
      if (selected.has(blockId)) node.setAttribute('data-block-selected', 'true')
      else node.removeAttribute('data-block-selected')
    }
  }

  function clearBlockSelection(editorElement: HTMLElement): void {
    applyBlockSelection(editorElement, [])
  }

  function emitActiveBlockFocus(editorElement: HTMLElement): void {
    const contentElement = getActiveContentElement(editorElement)
    onBlockFocus?.(contentElement?.id)
  }

  function setCaretInContent(target: HTMLElement, toStart: boolean): void {
    editorElementFocus()
    createCaret(target, toStart)
    onBlockFocus?.(target.id)
  }

  function editorElementFocus(): void {
    const editorElement = editorRef.current
    if (editorElement) editorElement.focus()
  }

  function collapseCurrentBlock(blockId: string): boolean {
    const location = findBlockLocation(blocks, blockId)
    if (!location || location.block.children.length === 0 || collapsed.has(blockId)) return false
    onToggleCollapse(blockId)
    return true
  }

  function expandCurrentBlock(blockId: string): boolean {
    if (!collapsed.has(blockId)) return false
    onToggleCollapse(blockId)
    return true
  }

  function selectBlockRange(editorElement: HTMLElement, anchorId: string, extentId: string): boolean {
    const anchorEl = document.getElementById(anchorId)
    const extentEl = document.getElementById(extentId)
    if (!(anchorEl instanceof HTMLElement) || !(extentEl instanceof HTMLElement)) return false
    if (!editorElement.contains(anchorEl) || !editorElement.contains(extentEl)) return false

    const selection = window.getSelection()
    if (!selection) return false

    const order = compareBlockOrder(blocks, anchorId, extentId)
    const startEl = order <= 0 ? anchorEl : extentEl
    const endEl = order <= 0 ? extentEl : anchorEl
    const startNode = firstTextNode(startEl)
    const endNode = lastTextNode(endEl)
    if (!startNode || !endNode) return false

    const range = document.createRange()
    range.setStart(startNode, 0)
    range.setEnd(endNode, endNode.textContent?.length ?? 0)

    selection.removeAllRanges()
    selection.addRange(range)
    return true
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const editorElement = editorRef.current
    if (!editorElement) return

    const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey
    const isRedo = (event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))

    if (isUndo) {
      event.preventDefault()
      onUndo()
      return
    }

    if (isRedo) {
      event.preventDefault()
      onRedo()
      return
    }

    let contentElement = getActiveContentElement(editorElement)
    if (!contentElement) {
      const active = document.activeElement
      if (active instanceof HTMLElement) {
        const maybeContent = active.closest('.block-content')
        if (maybeContent instanceof HTMLElement && editorElement.contains(maybeContent)) contentElement = maybeContent
      }
    }
    if (!contentElement) return
    const blockId = contentElement.id

    const isMeta = event.metaKey || event.ctrlKey

    if (isMeta && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      clearBlockSelection(editorElement)
      const now = Date.now()
      const previous = selectAllStateRef.current
      const sameBlock = previous.blockId === blockId
      const stage = sameBlock && now - previous.timestamp < 1200 ? (previous.stage % 3) + 1 : 1
      selectAllStateRef.current = { blockId, stage, timestamp: now }

      const selection = window.getSelection()
      if (!selection) return

      const blockElement = contentElement.closest('.block')
      const headerElement = contentElement.closest('.block-header')
      const range = document.createRange()

      if (stage === 1) range.selectNodeContents(contentElement)
      else if (stage === 2 && headerElement) range.selectNodeContents(headerElement)
      else if (blockElement) {
        const startNode = firstTextNode(contentElement)
        const visibleBlocks = getVisibleContentElements(editorElement)
        const index = visibleBlocks.findIndex((node) => node.id === blockId)
        const subtreeNodes: HTMLElement[] = []

        if (index >= 0) {
          subtreeNodes.push(visibleBlocks[index])
          for (let i = index + 1; i < visibleBlocks.length; i += 1) {
            const candidate = visibleBlocks[i]
            if (!blockElement.contains(candidate)) break
            subtreeNodes.push(candidate)
          }
        }

        const endNode = lastTextNode(subtreeNodes[subtreeNodes.length - 1] ?? contentElement)
        if (startNode && endNode) {
          range.setStart(startNode, 0)
          range.setEnd(endNode, endNode.textContent?.length ?? 0)
          applyBlockSelection(editorElement, subtreeNodes.map((node) => node.id))
        } else {
          range.selectNodeContents(editorElement)
        }
      }
      else range.selectNodeContents(contentElement)

      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.altKey && !isMeta) {
      event.preventDefault()
      const direction: 'prev' | 'next' = event.key === 'ArrowUp' ? 'prev' : 'next'
      const anchorId = blockRangeSelectionRef.current.anchorId ?? blockId
      const extentId = blockRangeSelectionRef.current.extentId ?? blockId
      const nextFrom = extentId === blockId ? blockId : extentId
      const adjacent = getAdjacentVisibleContent(editorElement, nextFrom, direction)
      if (!adjacent) return
      blockRangeSelectionRef.current = { anchorId, extentId: adjacent.id }
      selectBlockRange(editorElement, anchorId, adjacent.id)

      const visibleIds = getVisibleContentElements(editorElement).map((node) => node.id)
      const start = visibleIds.indexOf(anchorId)
      const end = visibleIds.indexOf(adjacent.id)
      if (start >= 0 && end >= 0) {
        const lower = Math.min(start, end)
        const upper = Math.max(start, end)
        applyBlockSelection(editorElement, visibleIds.slice(lower, upper + 1))
      }
      return
    }

    blockRangeSelectionRef.current = {}
    clearBlockSelection(editorElement)

    if (isMeta && event.key === '.') {
      event.preventDefault()
      onToggleCollapse(blockId)
      return
    }

    if (isMeta && !event.shiftKey && event.key === 'ArrowUp') {
      event.preventDefault()
      if (!collapseCurrentBlock(blockId)) {
        const prev = getAdjacentVisibleContent(editorElement, blockId, 'prev')
        if (prev) setCaretInContent(prev, false)
      }
      return
    }

    if (isMeta && !event.shiftKey && event.key === 'ArrowDown') {
      event.preventDefault()
      if (!expandCurrentBlock(blockId)) {
        const next = getAdjacentVisibleContent(editorElement, blockId, 'next')
        if (next) setCaretInContent(next, true)
      }
      return
    }

    if (!event.altKey && !isMeta && event.key === 'ArrowLeft' && getCaretTextOffset(contentElement) === 0) {
      if (collapseCurrentBlock(blockId)) event.preventDefault()
      return
    }

    if (!event.altKey && !isMeta && event.key === 'ArrowRight' && getCaretTextOffset(contentElement) === 0) {
      if (expandCurrentBlock(blockId)) event.preventDefault()
      return
    }

    if (!event.shiftKey && !event.altKey && !isMeta && event.key === 'ArrowUp' && getCaretTextOffset(contentElement) === 0) {
      const prev = getAdjacentVisibleContent(editorElement, blockId, 'prev')
      if (prev) {
        event.preventDefault()
        setCaretInContent(prev, false)
      }
      return
    }

    if (!event.shiftKey && !event.altKey && !isMeta && event.key === 'ArrowDown' && getCaretTextOffset(contentElement) === (contentElement.textContent?.length ?? 0)) {
      const next = getAdjacentVisibleContent(editorElement, blockId, 'next')
      if (next) {
        event.preventDefault()
        setCaretInContent(next, true)
      }
      return
    }

    if (!event.shiftKey && !event.altKey && !isMeta && event.key === 'Home') {
      event.preventDefault()
      const offset = getCaretTextOffset(contentElement)
      if (offset > 0) setCaretOffset(contentElement, 0)
      else {
        const prev = getAdjacentVisibleContent(editorElement, blockId, 'prev')
        if (prev) setCaretInContent(prev, true)
      }
      return
    }

    if (!event.shiftKey && !event.altKey && !isMeta && event.key === 'End') {
      event.preventDefault()
      const length = contentElement.textContent?.length ?? 0
      const offset = getCaretTextOffset(contentElement)
      if (offset < length) setCaretOffset(contentElement, length)
      else {
        const next = getAdjacentVisibleContent(editorElement, blockId, 'next')
        if (next) setCaretInContent(next, false)
      }
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const trimmed = (contentElement.textContent ?? '').trim()
      const location = findBlockLocation(blocks, blockId)
      const shouldPromoteToNewPageOnEmptyTopLevel =
        trimmed.length === 0 &&
        Boolean(location?.parent?.isPageRoot) &&
        (location?.block.children.length ?? 0) === 0
      const shouldBreakOutOnEmpty =
        trimmed.length === 0 &&
        Boolean(location?.parent) &&
        !Boolean(location?.parent?.isPageRoot) &&
        (location?.block.children.length ?? 0) === 0

      if (shouldPromoteToNewPageOnEmptyTopLevel) {
        event.preventDefault()
        saveCaret(editorElement)
        onBlocksMutate(promoteBlockToNewPage(blocks, blockId, createId))
        return
      }

      if (shouldBreakOutOnEmpty) {
        event.preventDefault()
        saveCaret(editorElement)
        onBlocksMutate(outdentBlock(blocks, blockId))
        return
      }

      event.preventDefault()
      const [before, after] = splitElement(contentElement)
      saveCaret(editorElement)
      onBlocksMutate(splitBlock(blocks, blockId, before, after, createId))
      return
    }

    if (event.key === 'Backspace') {
      const currentText = (contentElement.textContent ?? '').trim()
      const isAtStart = getCaretTextOffset(contentElement) === 0

      if (currentText.length === 0 || isAtStart) {
        event.preventDefault()
        saveCaret(editorElement)
        onBlocksMutate(mergeBlock(blocks, blockId))
      }
      return
    }

    if (event.key === 'Delete') {
      const currentText = contentElement.textContent ?? ''
      const trimmed = currentText.trim()
      const isAtEnd = getCaretTextOffset(contentElement) === currentText.length

      if (trimmed.length === 0) {
        event.preventDefault()
        saveCaret(editorElement)
        onBlocksMutate(deleteBlock(blocks, blockId))
        return
      }

      if (isAtEnd) {
        event.preventDefault()
        saveCaret(editorElement)
        onBlocksMutate(mergeBlockWithNext(blocks, blockId))
        return
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      saveCaret(editorElement)
      if (event.shiftKey) {
        const location = findBlockLocation(blocks, blockId)
        if (location?.parent?.isPageRoot) onBlocksMutate(promoteBlockToNewPage(blocks, blockId, createId))
        else onBlocksMutate(outdentBlock(blocks, blockId))
      }
      else {
        const location = findBlockLocation(blocks, blockId)
        if (location?.block.isPageRoot) onBlocksMutate(indentPageRoot(blocks, blockId))
        else onBlocksMutate(indentBlock(blocks, blockId))
      }
      return
    }

    if ((event.altKey || (isMeta && event.shiftKey)) && event.key === 'ArrowUp') {
      event.preventDefault()
      saveCaret(editorElement)
      onBlocksMutate(moveBlockUp(blocks, blockId))
      return
    }

    if ((event.altKey || (isMeta && event.shiftKey)) && event.key === 'ArrowDown') {
      event.preventDefault()
      saveCaret(editorElement)
      onBlocksMutate(moveBlockDown(blocks, blockId))
      return
    }

    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      saveCaret(editorElement)
      onBlocksMutate(outdentBlock(blocks, blockId))
      return
    }

    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault()
      saveCaret(editorElement)
      onBlocksMutate(indentBlock(blocks, blockId))
      return
    }

  }

  function handleEditorKeyUp(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const editorElement = editorRef.current
    if (!editorElement) return

    const key = event.key
    const ignored =
      key === 'Tab' ||
      key === 'Enter' ||
      key === 'Escape' ||
      key === 'Alt' ||
      key === 'Control' ||
      key === 'Meta' ||
      key === 'Shift' ||
      key === 'CapsLock' ||
      key.startsWith('F') ||
      key.startsWith('Arrow')

    if (ignored) {
      emitActiveBlockFocus(editorElement)
      return
    }

    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const contentElement = target.closest('.block-content')
    if (!(contentElement instanceof HTMLElement)) return

    onBlocksChange(setBlockContent(blocks, contentElement.id, contentElement.textContent ?? ''), true, true)
    emitActiveBlockFocus(editorElement)
  }

  return (
    <div
      ref={editorRef}
      className="outliner-editor"
      contentEditable
      suppressContentEditableWarning
      onKeyDown={handleEditorKeyDown}
      onKeyUp={handleEditorKeyUp}
      onMouseUp={() => {
        const editorElement = editorRef.current
        if (editorElement) emitActiveBlockFocus(editorElement)
      }}
    >
      <BlockView blocks={blocks} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </div>
  )
}

export default function Outliner({ pages, onPagesChange, onBlockFocus, focusRequest, onUndo, onRedo, canUndo, canRedo }: OutlinerProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => pagesToBlocks(pages))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const editorRef = useRef<HTMLDivElement>(null)
  const idCounterRef = useRef(0)
  const selfCommittedPagesRef = useRef<string | null>(null)
  const pendingMutationRef = useRef<MutationResult | null>(null)
  const pendingCaretRestoreRef = useRef<CaretSnapshot | null>(null)
  const pendingExternalFocusRef = useRef<{ blockId: string; requestId: number } | null>(null)

  function snapshotPages(input: OutlinerPage[]): string {
    return JSON.stringify(input)
  }

  useEffect(() => {
    const incomingSnapshot = snapshotPages(pages)
    if (selfCommittedPagesRef.current === incomingSnapshot) {
      selfCommittedPagesRef.current = null
      return
    }

    setBlocks(pagesToBlocks(pages))
  }, [pages])

  const blockIdSet = useMemo(() => new Set(flattenBlockIds(blocks)), [blocks])

  useEffect(() => {
    setCollapsed((previous) => new Set(Array.from(previous).filter((id) => blockIdSet.has(id))))
  }, [blockIdSet])

  useEffect(() => {
    if (!focusRequest) return

    const location = findBlockLocation(blocks, focusRequest.blockId)
    if (!location) return

    pendingExternalFocusRef.current = {
      blockId: focusRequest.blockId,
      requestId: focusRequest.requestId,
    }

    if (!focusRequest.expandAncestors) return

    const ancestorIds = findAncestorIds(blocks, focusRequest.blockId)
    if (ancestorIds.length === 0) return

    setCollapsed((previous) => {
      const next = new Set(previous)
      for (const ancestorId of ancestorIds) next.delete(ancestorId)
      return next
    })
  }, [blocks, focusRequest])

  useLayoutEffect(() => {
    const pending = pendingMutationRef.current
    if (!pending) return

    pendingMutationRef.current = null
    const editorElement = editorRef.current
    if (!editorElement) return

    if (pending.focusId) {
      const target = document.getElementById(pending.focusId)
      if (target instanceof HTMLElement) {
        // Structural edits may leave a marker behind in the previous block.
        // Remove it before focusing the new block to avoid stale caret restores.
        clearSavedCaret(editorElement)
        editorElement.focus()
        if (typeof pending.caretOffset === 'number') setCaretOffset(target, pending.caretOffset)
        else createCaret(target, pending.placeCaretAtStart ?? false)
        onBlockFocus?.(target.id)
        return
      }
    }

    restoreCaret(editorElement)
  }, [blocks, onBlockFocus])

  useLayoutEffect(() => {
    const pending = pendingExternalFocusRef.current
    if (!pending) return

    const editorElement = editorRef.current
    if (!editorElement) return

    const target = document.getElementById(pending.blockId)
    if (!(target instanceof HTMLElement) || !editorElement.contains(target)) return

    pendingExternalFocusRef.current = null
    clearSavedCaret(editorElement)
    editorElement.focus()
    createCaret(target, false)
    onBlockFocus?.(target.id)
  }, [blocks, collapsed, onBlockFocus])

  function createId(): string {
    idCounterRef.current += 1
    return `block:${Date.now().toString(36)}:${idCounterRef.current.toString(36)}`
  }

  function commitBlocks(next: Block[], preserveCaret = false, skipLocalStateUpdate = false): void {
    if (preserveCaret) {
      const editorElement = editorRef.current
      const activeContent = editorElement ? getActiveContentElement(editorElement) : null
      pendingCaretRestoreRef.current = activeContent
        ? {
          blockId: activeContent.id,
          offset: getCaretTextOffset(activeContent),
        }
        : null
    }

    if (!skipLocalStateUpdate) {
      setBlocks(next)
    }

    const nextPages = blocksToPages(next)
    selfCommittedPagesRef.current = snapshotPages(nextPages)
    onPagesChange(nextPages)

    if (!preserveCaret) return

    requestAnimationFrame(() => {
      const editorElement = editorRef.current
      if (!editorElement) return
      const pendingCaret = pendingCaretRestoreRef.current
      pendingCaretRestoreRef.current = null

      if (restoreCaret(editorElement)) return

      const activeContent = getActiveContentElement(editorElement)
      if (activeContent) {
        onBlockFocus?.(activeContent.id)
        return
      }

      if (!pendingCaret) return

      const target = document.getElementById(pendingCaret.blockId)
      if (!(target instanceof HTMLElement) || !editorElement.contains(target)) return
      editorElement.focus()
      setCaretOffset(target, pendingCaret.offset)
      onBlockFocus?.(target.id)
    })
  }

  function applyMutation(result: MutationResult): void {
    if (result.blocks === blocks) {
      const editorElement = editorRef.current
      if (editorElement) restoreCaret(editorElement)
      return
    }

    pendingMutationRef.current = result
    setBlocks(result.blocks)
    const nextPages = blocksToPages(result.blocks)
    selfCommittedPagesRef.current = snapshotPages(nextPages)
    onPagesChange(nextPages)
  }

  function toggleCollapse(id: string): void {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main aria-label="Outliner" className="flex min-w-0 flex-1 flex-col bg-[var(--background)]">
      <h1 className="sr-only">Outliner</h1>
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--card)] px-4 py-2">
        <span className="text-[12px] font-semibold tracking-[0.4px] text-[var(--muted-foreground)]">OUTLINE EDITOR</span>
        <span className="text-[11px] text-[var(--muted-foreground)]">Enter split, Backspace merge, Tab/Shift+Tab nest, Alt+Arrows move</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--foreground)] disabled:opacity-40"
            aria-label="Undo outliner change"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--foreground)] disabled:opacity-40"
            aria-label="Redo outliner change"
          >
            Redo
          </button>
        </div>
      </div>

      <section className="flex-1 overflow-auto bg-[var(--muted)] p-4">
        <div className="mx-auto min-h-full w-full max-w-4xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <OutlinerEditor
            blocks={blocks}
            collapsed={collapsed}
            editorRef={editorRef}
            onBlocksChange={commitBlocks}
            onBlocksMutate={applyMutation}
            onToggleCollapse={toggleCollapse}
            onBlockFocus={onBlockFocus}
            onUndo={onUndo}
            onRedo={onRedo}
            createId={createId}
          />
        </div>
      </section>
    </main>
  )
}

export const __testing = {
  pagesToBlocks,
  blocksToPages,
  findPrevBlock,
  findPrevNonPageBlock,
  findNextBlock,
  splitBlock,
  mergeBlock,
  indentBlock,
  indentPageRoot,
  outdentBlock,
  promoteBlockToNewPage,
  moveBlockUp,
  moveBlockDown,
  deleteBlock,
  setBlockContent,
  saveCaret,
  restoreCaret,
  createCaret,
  splitElement,
  getCaretTextOffset,
}
