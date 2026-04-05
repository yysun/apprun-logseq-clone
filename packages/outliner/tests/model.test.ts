import { describe, expect, it } from 'vitest'
import { __testing } from '../src'
import type { OutlinerPage } from '../src'

const basePages: OutlinerPage[] = [
  {
    id: 'page-a',
    title: 'Page A',
    blocks: [
      {
        id: 'task-a1',
        content: 'Task A1',
        children: [{ id: 'story-a1', content: 'Story A1', children: [] }],
      },
      {
        id: 'task-a2',
        content: 'Task A2',
        children: [{ id: 'story-a2', content: 'Story A2', children: [] }],
      },
    ],
  },
]

function nextIdFactory() {
  let n = 0
  return () => {
    n += 1
    return `generated-${n}`
  }
}

describe('outliner model conversion', () => {
  it('converts pages to block tree with page roots', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].id).toBe('page:page-a')
    expect(blocks[0].children).toHaveLength(2)
    expect(blocks[0].children[0].id).toBe('task-a1')
    expect(blocks[0].children[0].children[0].id).toBe('story-a1')
  })

  it('round-trips blocks back to pages', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const pages = __testing.blocksToPages(blocks)
    expect(pages).toHaveLength(1)
    expect(pages[0].blocks.map((b) => b.id)).toEqual(['task-a1', 'task-a2'])
    expect(pages[0].blocks.flatMap((b) => b.children).map((c) => c.id)).toEqual(['story-a1', 'story-a2'])
  })
})

describe('outliner model traversal', () => {
  it('finds previous and next block ids in linear order', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    expect(__testing.findPrevBlock(blocks, 'task-a1')).toBe('page:page-a')
    expect(__testing.findNextBlock(blocks, 'task-a1')).toBe('story-a1')
    expect(__testing.findPrevBlock(blocks, 'page:page-a')).toBeNull()
    expect(__testing.findNextBlock(blocks, 'story-a2')).toBeNull()
  })
})

describe('outliner model mutations', () => {
  it('splits a block into a sibling and focuses new block', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.splitBlock(blocks, 'task-a1', 'Task', ' A1', nextIdFactory())

    expect(result.blocks[0].children).toHaveLength(3)
    expect(result.blocks[0].children[0].content).toBe('Task')
    expect(result.blocks[0].children[1].content).toBe(' A1')
    expect(result.focusId).toBe('generated-1')
    expect(result.placeCaretAtStart).toBe(true)
  })

  it('merges into previous block and carries children', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const split = __testing.splitBlock(blocks, 'story-a1', 'Story ', 'A1', nextIdFactory())
    const merged = __testing.mergeBlock(split.blocks, split.focusId!)

    const roundTrip = __testing.blocksToPages(merged.blocks)
    expect(roundTrip[0].blocks[0].children.find((c) => c.id === 'story-a1')?.content).toBe('Story A1')
    expect(merged.focusId).toBe('story-a1')
    expect(merged.caretOffset).toBe('Story '.length)
  })

  it('merges page-level block into previous page leaf block', () => {
    const pages: OutlinerPage[] = [
      {
        id: 'page-a',
        title: 'Page A',
        blocks: [
          {
            id: 'task-a1',
            content: 'Task A1',
            children: [{ id: 'story-a1', content: 'Story A1', children: [] }],
          },
        ],
      },
      {
        id: 'page-b',
        title: 'Page B',
        blocks: [{ id: 'story-b1', content: 'Story B1', children: [] }],
      },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const merged = __testing.mergeBlock(blocks, 'story-b1')
    const roundTrip = __testing.blocksToPages(merged.blocks)

    expect(roundTrip[0]?.blocks[0]?.children[0]?.content).toBe('Story A1Story B1')
    expect(roundTrip[1]?.blocks).toEqual([])
    expect(merged.focusId).toBe('story-a1')
  })

  it('does not merge root page blocks', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const merged = __testing.mergeBlock(blocks, 'page:page-a')
    expect(merged.blocks).toBe(blocks)
  })

  it('indents block under previous sibling', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.indentBlock(blocks, 'task-a2')

    expect(result.blocks[0].children).toHaveLength(1)
    expect(result.blocks[0].children[0].children.map((c) => c.id)).toContain('task-a2')
    expect(result.focusId).toBe('task-a2')
  })

  it('does not indent first sibling', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.indentBlock(blocks, 'task-a1')
    expect(result.blocks).toBe(blocks)
  })

  it('indents first block of next page under previous page leaf', () => {
    const pages: OutlinerPage[] = [
      {
        id: 'page-a',
        title: 'Page A',
        blocks: [
          {
            id: 'task-a1',
            content: 'Task A1',
            children: [{ id: 'story-a1', content: 'Story A1', children: [] }],
          },
        ],
      },
      {
        id: 'page-b',
        title: 'Page B',
        blocks: [{ id: 'story-b1', content: 'Story B1', children: [] }],
      },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const result = __testing.indentBlock(blocks, 'story-b1')
    const roundTrip = __testing.blocksToPages(result.blocks)

    expect(roundTrip[0]?.blocks[0]?.children.map((child) => child.id)).toEqual(['story-a1'])
    expect(roundTrip[0]?.blocks[0]?.children[0]?.children.map((child) => child.id)).toEqual(['story-b1'])
    expect(roundTrip[1]?.blocks).toEqual([])
  })

  it('outdents nested block back to parent sibling level', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const indented = __testing.indentBlock(blocks, 'task-a2')
    const outdented = __testing.outdentBlock(indented.blocks, 'task-a2')

    expect(outdented.blocks[0].children).toHaveLength(2)
    expect(outdented.blocks[0].children[1].id).toBe('task-a2')
  })

  it('outdents a child block to top-level under the page root', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.outdentBlock(blocks, 'story-a1')

    expect(result.blocks[0].children.map((child) => child.id)).toEqual(['task-a1', 'story-a1', 'task-a2'])
    expect(result.blocks[0].children[0]?.children).toEqual([])
    expect(result.focusId).toBe('story-a1')
  })

  it('promotes a top-level block into a new page root', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.promoteBlockToNewPage(blocks, 'task-a2', nextIdFactory())

    const pages = __testing.blocksToPages(result.blocks)
    expect(pages).toHaveLength(2)
    expect(pages[0]?.blocks.map((block) => block.id)).toEqual(['task-a1'])
    expect(pages[1]?.title).toBe('Task A2')
    expect(pages[1]?.blocks.map((block) => block.id)).toEqual(['story-a2'])
    expect(result.focusId).toBe('story-a2')
  })

  it('merges page-root line into previous page-root line', () => {
    const pages: OutlinerPage[] = [
      { id: 'p1', title: '1', blocks: [] },
      { id: 'p2', title: '2', blocks: [] },
      { id: 'p3', title: '3', blocks: [] },
      { id: 'p4', title: '4', blocks: [] },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const merged = __testing.mergeBlock(blocks, 'page:p2')
    const next = __testing.blocksToPages(merged.blocks)

    expect(next.map((page) => page.title)).toEqual(['12', '3', '4'])
    expect(merged.focusId).toBe('page:p1')
  })

  it('indents page-root line under previous page-root line', () => {
    const pages: OutlinerPage[] = [
      { id: 'p1', title: '1', blocks: [] },
      { id: 'p2', title: '2', blocks: [] },
      { id: 'p3', title: '3', blocks: [] },
      { id: 'p4', title: '4', blocks: [] },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const indented = __testing.indentPageRoot(blocks, 'page:p2')
    const next = __testing.blocksToPages(indented.blocks)

    expect(next.map((page) => page.title)).toEqual(['1', '3', '4'])
    expect(next[0]?.blocks.map((block) => block.content)).toEqual(['2'])
  })

  it('retains content when newly broken-out page item is indented then unindented', () => {
    const pages: OutlinerPage[] = [
      {
        id: 'p1',
        title: '1',
        blocks: [{ id: 'a', content: 'A', children: [] }],
      },
      {
        id: 'p2',
        title: '2',
        blocks: [{ id: 'b', content: 'B', children: [] }],
      },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const indented = __testing.indentPageRoot(blocks, 'page:p2')
    const page1Leaf = __testing.blocksToPages(indented.blocks)[0]?.blocks.find((block) => block.content === '2')
    expect(page1Leaf?.content).toBe('2')
    expect(page1Leaf?.children.map((child) => child.id)).toEqual(['b'])

    const unindented = __testing.promoteBlockToNewPage(indented.blocks, page1Leaf!.id, nextIdFactory())
    const roundTrip = __testing.blocksToPages(unindented.blocks)
    expect(roundTrip).toHaveLength(2)
    expect(roundTrip[1]?.title).toBe('2')
    expect(roundTrip[1]?.blocks.map((block) => block.id)).toEqual(['b'])
    expect(roundTrip[1]?.blocks[0]?.content).toBe('B')
  })

  it('moves blocks up and down among siblings', () => {
    const pages: OutlinerPage[] = [
      {
        id: 'page-a',
        title: 'Page A',
        blocks: [
          { id: 't1', content: 'T1', children: [] },
          { id: 't2', content: 'T2', children: [] },
          { id: 't3', content: 'T3', children: [] },
        ],
      },
    ]

    const blocks = __testing.pagesToBlocks(pages)
    const up = __testing.moveBlockUp(blocks, 't3')
    expect(up.blocks[0].children.map((c) => c.id)).toEqual(['t1', 't3', 't2'])

    const down = __testing.moveBlockDown(up.blocks, 't1')
    expect(down.blocks[0].children.map((c) => c.id)).toEqual(['t3', 't1', 't2'])
  })

  it('deletes non-root block and computes focus fallback', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.deleteBlock(blocks, 'story-a2')
    const remaining = __testing.blocksToPages(result.blocks)

    expect(remaining[0].blocks[1].children.map((c) => c.id)).toEqual([])
    expect(result.focusId).toBe('task-a2')
  })

  it('does not delete root page block', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const result = __testing.deleteBlock(blocks, 'page:page-a')
    expect(result.blocks).toBe(blocks)
  })

  it('updates block content by id', () => {
    const blocks = __testing.pagesToBlocks(basePages)
    const updated = __testing.setBlockContent(blocks, 'task-a1', 'Renamed')
    const roundTripped = __testing.blocksToPages(updated)

    expect(roundTripped[0].blocks[0].content).toBe('Renamed')
  })
})
