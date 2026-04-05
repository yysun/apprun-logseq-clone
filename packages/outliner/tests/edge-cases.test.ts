import { describe, expect, it } from 'vitest'
import { __testing } from '../src'
import type { OutlinerPage } from '../src'

function pagesFixture(): OutlinerPage[] {
  return [
    {
      id: 'p1',
      title: 'Page 1',
      blocks: [
        {
          id: 't1',
          content: 'Task 1',
          children: [{ id: 's1', content: 'Story 1', children: [] }],
        },
        {
          id: 't2',
          content: 'Task 2',
          children: [{ id: 's2', content: 'Story 2', children: [] }],
        },
      ],
    },
  ]
}

function idFactory() {
  let n = 0
  return () => {
    n += 1
    return `id-${n}`
  }
}

describe('edge cases: conversion and mutation guards', () => {
  it('handles empty pages list', () => {
    const blocks = __testing.pagesToBlocks([])
    expect(blocks).toEqual([])
    expect(__testing.blocksToPages(blocks)).toEqual([])
  })

  it('returns original reference for setBlockContent with unknown id', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.setBlockContent(blocks, 'missing', 'x')
    expect(result).toBe(blocks)
  })

  it('returns original blocks for splitBlock when id does not exist', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.splitBlock(blocks, 'missing', 'a', 'b', idFactory())
    expect(result.blocks).toBe(blocks)
    expect(result.focusId).toBeUndefined()
  })

  it('returns original blocks for mergeBlock when id does not exist', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.mergeBlock(blocks, 'missing')
    expect(result.blocks).toBe(blocks)
  })

  it('does not merge top-level page root block', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.mergeBlock(blocks, 'page:p1')
    expect(result.blocks).toBe(blocks)
  })

  it('does not outdent top-level block directly under page root', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.outdentBlock(blocks, 't2')
    expect(result.blocks).toBe(blocks)
  })

  it('does not move first sibling up', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.moveBlockUp(blocks, 't1')
    expect(result.blocks).toBe(blocks)
  })

  it('does not move last sibling down', () => {
    const blocks = __testing.pagesToBlocks(pagesFixture())
    const result = __testing.moveBlockDown(blocks, 't2')
    expect(result.blocks).toBe(blocks)
  })

  it('deleting only nested child yields parent focus fallback', () => {
    const single: OutlinerPage[] = [
      {
        id: 'p1',
        title: 'Page 1',
        blocks: [{ id: 't1', content: 'Task 1', children: [{ id: 's1', content: 'Story 1', children: [] }] }],
      },
    ]

    const blocks = __testing.pagesToBlocks(single)
    const result = __testing.deleteBlock(blocks, 's1')
    expect(result.focusId).toBe('t1')
  })
})

describe('edge cases: caret utilities boundaries', () => {
  it('splitElement at start returns empty before segment', () => {
    const el = document.createElement('div')
    el.contentEditable = 'true'
    el.textContent = 'hello'
    document.body.appendChild(el)

    const textNode = el.firstChild as Text
    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(__testing.splitElement(el)).toEqual(['', 'hello'])
    el.remove()
  })

  it('splitElement at end returns empty after segment', () => {
    const el = document.createElement('div')
    el.contentEditable = 'true'
    el.textContent = 'hello'
    document.body.appendChild(el)

    const textNode = el.firstChild as Text
    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(textNode, 5)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(__testing.splitElement(el)).toEqual(['hello', ''])
    el.remove()
  })

  it('saveCaret returns false when selection is outside element', () => {
    const parent = document.createElement('div')
    const inside = document.createElement('div')
    const outside = document.createElement('div')
    inside.textContent = 'inside'
    outside.textContent = 'outside'
    parent.appendChild(inside)
    document.body.appendChild(parent)
    document.body.appendChild(outside)

    const node = outside.firstChild as Text
    const selection = window.getSelection()
    const range = document.createRange()
    range.setStart(node, 2)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(__testing.saveCaret(parent)).toBe(false)
    parent.remove()
    outside.remove()
  })
})
