/**
 * Adapter component to use the React Outliner component within AppRun
 * This bridges AppRun's component system with React's rendering
 */
import { Component } from 'apprun';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import Outliner from 'outliner';
import type { OutlinerPage, OutlinerProps } from 'outliner';
import 'outliner/styles.css';

type OutlinerAdapterProps = Omit<OutlinerProps, 'pages' | 'onPagesChange'> & {
  pages: OutlinerPage[];
  onPagesChange?: (pages: OutlinerPage[]) => void;
};

/**
 * AppRun wrapper component for the React Outliner
 */
export default class OutlinerAdapter extends Component<OutlinerAdapterProps> {
  private root: Root | null = null;
  private containerRef: HTMLDivElement | null = null;

  view = () => {
    return <div ref={(el: HTMLDivElement) => this.containerRef = el} class="outliner-container"></div>;
  }

  rendered = (props: OutlinerAdapterProps) => {
    if (!this.containerRef) return;

    // Initialize React root if not already created
    if (!this.root) {
      this.root = createRoot(this.containerRef);
    }

    // Render the React Outliner component
    const reactElement = createElement(Outliner, {
      pages: props.pages || [],
      onPagesChange: props.onPagesChange || (() => { }),
      onBlockFocus: props.onBlockFocus,
      focusRequest: props.focusRequest,
      onUndo: props.onUndo || (() => { }),
      onRedo: props.onRedo || (() => { }),
      canUndo: props.canUndo ?? false,
      canRedo: props.canRedo ?? false,
    });

    this.root.render(reactElement);
  }

  unload = () => {
    // Clean up React root when component is unmounted
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
