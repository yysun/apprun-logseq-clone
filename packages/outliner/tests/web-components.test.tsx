import React, { act } from 'react'
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest'
import {
  defineOutlinerElement,
  OUTLINER_ELEMENT_TAG,
  type OutlinerElement,
  type OutlinerPage,
} from '../src'

const pages: OutlinerPage[] = [
  {
    id: 'page-1',
    title: 'Page 1',
    blocks: [
      {
        id: 'block-1',
        content: 'First block',
        children: [],
      },
    ],
  },
]

describe('outliner web component', () => {
  beforeAll(() => {
    defineOutlinerElement()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders pages passed through element properties', async () => {
    const element = document.createElement(OUTLINER_ELEMENT_TAG) as OutlinerElement

    await act(async () => {
      element.pages = pages
      document.body.appendChild(element)
    })

    expect(element.querySelector('[aria-label="Outliner"]')).not.toBeNull()
    expect(element.textContent).toContain('First block')
  })

  it('dispatches undo and redo events from toolbar actions', async () => {
    const element = document.createElement(OUTLINER_ELEMENT_TAG) as OutlinerElement
    const undoHandler = vi.fn()
    const redoHandler = vi.fn()

    element.pages = pages
    element.canUndo = true
    element.canRedo = true
    element.addEventListener('undo', undoHandler)
    element.addEventListener('redo', redoHandler)

    await act(async () => {
      document.body.appendChild(element)
    })

    const undoButton = element.querySelector('[aria-label="Undo outliner change"]') as HTMLButtonElement
    const redoButton = element.querySelector('[aria-label="Redo outliner change"]') as HTMLButtonElement

    await act(async () => {
      undoButton.click()
      redoButton.click()
    })

    expect(undoHandler).toHaveBeenCalledTimes(1)
    expect(redoHandler).toHaveBeenCalledTimes(1)
  })
})
