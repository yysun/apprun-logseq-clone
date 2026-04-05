import { describe, expect, it } from 'vitest'
import { __testing } from '../src'

function withEditable(text = 'hello world'): HTMLDivElement {
  const el = document.createElement('div')
  el.contentEditable = 'true'
  el.textContent = text
  document.body.appendChild(el)
  return el
}

function setCaret(el: HTMLElement, offset: number): void {
  const node = el.firstChild
  if (!node) throw new Error('missing text node')
  const selection = window.getSelection()
  if (!selection) throw new Error('missing selection')
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

describe('caret primitives', () => {
  it('measures caret text offset', () => {
    const el = withEditable('abcde')
    setCaret(el, 3)
    expect(__testing.getCaretTextOffset(el)).toBe(3)
    el.remove()
  })

  it('splits editable text around caret', () => {
    const el = withEditable('abcdef')
    setCaret(el, 2)
    expect(__testing.splitElement(el)).toEqual(['ab', 'cdef'])
    el.remove()
  })

  it('saves and restores caret via marker span', () => {
    const root = document.createElement('div')
    const child = document.createElement('div')
    child.contentEditable = 'true'
    child.textContent = 'abcdef'
    root.appendChild(child)
    document.body.appendChild(root)

    setCaret(child, 4)
    expect(__testing.saveCaret(root)).toBe(true)
    expect(root.querySelector('#__caret')).not.toBeNull()

    // Move caret away then restore.
    setCaret(child, 0)
    expect(__testing.restoreCaret(root)).toBe(true)
    expect(root.querySelector('#__caret')).toBeNull()
    expect(__testing.getCaretTextOffset(child)).toBe(4)

    root.remove()
  })

  it('creates caret at start and end', () => {
    const el = withEditable('12345')
    __testing.createCaret(el, true)
    expect(__testing.getCaretTextOffset(el)).toBe(0)

    __testing.createCaret(el, false)
    expect(__testing.getCaretTextOffset(el)).toBe(5)
    el.remove()
  })
})
