/**
 * Features:
 * - Renders a contenteditable editor wrapper for page/block outline content.
 * - Accepts content renderer via `pages` prop or JSX children function.
 * - Wires keyboard handlers and restores caret position after re-render.
 * Implementation notes:
 * - State is initialized from mounted JSX props/children and can carry a refresh source marker.
 * - Children normalization is done in `mounted` so `view` only consumes normalized state.
 * - Keeps a local editor element reference to avoid cross-editor caret resets.
 * Recent changes:
 * - Moved child array/function normalization from `view` into `mounted`.
 * - Kept backward compatibility for both `<Editor pages={pages} />` and `<Editor>{pages}</Editor>`.
 * - Hardened `mounted` to handle null/undefined props from JSX component mount calls.
 */
import { app, Component } from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import { restore_caret } from '../utils/caret';


type EditorProps = {
  pages?: () => any;
  children?: any;
};

type EditorState = EditorProps & {
  source?: HTMLElement | null;
};

const set_caret = (el?: HTMLElement | null) => {
  console.assert(document.querySelectorAll('#__caret').length <= 1, 'Too many caret');
  if (!el) return;
  restore_caret(el);
}

export default class extends Component<EditorState> {
  props: EditorProps;
  editor: HTMLElement | null = null;

  view = ({ pages, children }: EditorState) => {
    const content = pages ? pages() : children;
    return <div class="editor" contenteditable="true"
      $onkeydown={editor_keydown} $onkeyup={editor_keyup}>
      {content}
    </div>;
  }

  update = {
    '//refresh': (state: EditorState, source: HTMLElement | null) => {
      if (source && this.editor && source !== this.editor) {
        // render refresh from other editors
        return ({ ...state, source })
      }
    }
  }

  rendered = (state: EditorState) => {
    const host = this['element'];
    this.editor = typeof host === 'string'
      ? null
      : host.querySelector('.editor') as HTMLElement | null;
    // set caret only from own render
    !state.source && set_caret(this.editor);
  }

  mounted = (props: EditorProps = {}, children: any[] = []): EditorState => {
    const safeProps = props || {};
    const normalizedChildren = children.length === 1 ? children[0] : children;
    const pages = safeProps.pages ?? (typeof normalizedChildren === 'function' ? normalizedChildren : undefined);
    const content = pages ? undefined : normalizedChildren;
    return { ...safeProps, pages, children: content };
  };
}
