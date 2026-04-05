/**
 * Adapter component to use the Outliner web component within AppRun.
 * This keeps React contained inside the outliner package.
 */
import { Component } from 'apprun';
import {
  defineOutlinerElement,
  OUTLINER_ELEMENT_TAG,
  type OutlinerElement,
  type OutlinerPage,
  type OutlinerProps,
  type OutlinerPagesChangeEvent,
  type OutlinerBlockFocusEvent,
} from 'outliner';
import 'outliner/styles.css';

type OutlinerAdapterProps = Omit<OutlinerProps, 'pages' | 'onPagesChange'> & {
  pages: OutlinerPage[];
  onPagesChange?: (pages: OutlinerPage[]) => void;
};

/**
 * AppRun wrapper component for the outliner custom element.
 */
export default class OutlinerAdapter extends Component<OutlinerAdapterProps> {
  private containerRef: HTMLDivElement | null = null;
  private outlinerElement: OutlinerElement | null = null;
  private latestProps = {} as OutlinerAdapterProps;

  view = () => {
    return <div ref={(el: HTMLDivElement) => this.containerRef = el} class="outliner-container"></div>;
  }

  rendered = (props: OutlinerAdapterProps) => {
    this.latestProps = props;
    const element = this.ensureOutlinerElement();
    if (!element) return;

    element.pages = props.pages || [];
    element.focusRequest = props.focusRequest;
    element.canUndo = props.canUndo ?? false;
    element.canRedo = props.canRedo ?? false;
  }

  unload = () => {
    if (!this.outlinerElement) return;

    this.outlinerElement.removeEventListener('pages-change', this.handlePagesChange as EventListener);
    this.outlinerElement.removeEventListener('block-focus', this.handleBlockFocus as EventListener);
    this.outlinerElement.removeEventListener('undo', this.handleUndo);
    this.outlinerElement.removeEventListener('redo', this.handleRedo);
    this.outlinerElement.remove();
    this.outlinerElement = null;
  }

  private ensureOutlinerElement(): OutlinerElement | null {
    if (!this.containerRef) return null;
    if (this.outlinerElement) return this.outlinerElement;

    defineOutlinerElement();

    const element = document.createElement(OUTLINER_ELEMENT_TAG) as OutlinerElement;
    element.className = 'outliner-host';
    element.addEventListener('pages-change', this.handlePagesChange as EventListener);
    element.addEventListener('block-focus', this.handleBlockFocus as EventListener);
    element.addEventListener('undo', this.handleUndo);
    element.addEventListener('redo', this.handleRedo);

    this.containerRef.replaceChildren(element);
    this.outlinerElement = element;
    return element;
  }

  private handlePagesChange = (event: OutlinerPagesChangeEvent) => {
    this.latestProps.onPagesChange?.(event.detail.pages);
  };

  private handleBlockFocus = (event: OutlinerBlockFocusEvent) => {
    this.latestProps.onBlockFocus?.(event.detail.blockId);
  };

  private handleUndo = () => {
    this.latestProps.onUndo?.();
  };

  private handleRedo = () => {
    this.latestProps.onRedo?.();
  };
}
