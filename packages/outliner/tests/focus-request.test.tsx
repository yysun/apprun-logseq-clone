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
      ],
    },
  ]
}

describe('focus request behavior', () => {
  it('expands collapsed ancestors and focuses the requested block', () => {
    const pages = createPages()
    const onPagesChange = vi.fn()
    const onBlockFocus = vi.fn()

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)

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

    const collapseButton = container.querySelector('.bullet-arrow') as HTMLElement
    act(() => {
      collapseButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelector('#story\\:s1')).toBeNull()

    act(() => {
      root.render(
        <OutlinerLanes
          pages={pages}
          onPagesChange={onPagesChange}
          onBlockFocus={onBlockFocus}
          focusRequest={{ blockId: 'story:s1', requestId: 1, expandAncestors: true }}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          canUndo
          canRedo
        />,
      )
    })

    const focusedStory = container.querySelector('#story\\:s1') as HTMLElement
    expect(focusedStory).not.toBeNull()
    expect(onBlockFocus).toHaveBeenCalledWith('story:s1')

    act(() => root.unmount())
    container.remove()
  })
})
