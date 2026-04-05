import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import Outliner from './Outliner'
import './styles.css'
import type { OutlinerFocusRequest, OutlinerPage } from './types'

export const OUTLINER_ELEMENT_TAG = 'outliner-editor'

export type OutlinerElementProps = {
  pages?: OutlinerPage[]
  focusRequest?: OutlinerFocusRequest
  canUndo?: boolean
  canRedo?: boolean
}

export type OutlinerPagesChangeDetail = {
  pages: OutlinerPage[]
}

export type OutlinerBlockFocusDetail = {
  blockId?: string
}

export type OutlinerPagesChangeEvent = CustomEvent<OutlinerPagesChangeDetail>
export type OutlinerBlockFocusEvent = CustomEvent<OutlinerBlockFocusDetail>

export interface OutlinerElement extends HTMLElement {
  pages: OutlinerPage[]
  focusRequest?: OutlinerFocusRequest
  canUndo: boolean
  canRedo: boolean
}

class OutlinerElementImpl extends HTMLElement implements OutlinerElement {
  private root: Root | null = null
  private _pages: OutlinerPage[] = []
  private _focusRequest?: OutlinerFocusRequest
  private _canUndo = false
  private _canRedo = false

  connectedCallback(): void {
    this.renderOutliner()
  }

  disconnectedCallback(): void {
    this.root?.unmount()
    this.root = null
  }

  get pages(): OutlinerPage[] {
    return this._pages
  }

  set pages(value: OutlinerPage[]) {
    this._pages = value ?? []
    this.renderOutliner()
  }

  get focusRequest(): OutlinerFocusRequest | undefined {
    return this._focusRequest
  }

  set focusRequest(value: OutlinerFocusRequest | undefined) {
    this._focusRequest = value
    this.renderOutliner()
  }

  get canUndo(): boolean {
    return this._canUndo
  }

  set canUndo(value: boolean) {
    this._canUndo = Boolean(value)
    this.renderOutliner()
  }

  get canRedo(): boolean {
    return this._canRedo
  }

  set canRedo(value: boolean) {
    this._canRedo = Boolean(value)
    this.renderOutliner()
  }

  private ensureRoot(): Root {
    if (!this.root) this.root = createRoot(this)
    return this.root
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }))
  }

  private renderOutliner(): void {
    if (!this.isConnected) return

    this.style.display = 'block'

    this.ensureRoot().render(
      <Outliner
        pages={this._pages}
        onPagesChange={(pages) => this.emit('pages-change', { pages })}
        onBlockFocus={(blockId) => this.emit('block-focus', { blockId })}
        focusRequest={this._focusRequest}
        onUndo={() => this.emit('undo')}
        onRedo={() => this.emit('redo')}
        canUndo={this._canUndo}
        canRedo={this._canRedo}
      />
    )
  }
}

export function defineOutlinerElement(tagName = OUTLINER_ELEMENT_TAG): typeof OutlinerElementImpl {
  const existing = customElements.get(tagName)
  if (existing) return existing as typeof OutlinerElementImpl

  customElements.define(tagName, OutlinerElementImpl)
  return OutlinerElementImpl
}

declare global {
  interface HTMLElementTagNameMap {
    'outliner-editor': OutlinerElement
  }
}
