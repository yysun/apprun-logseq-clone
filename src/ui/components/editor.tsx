/**
 * Features:
 * - Renders a contenteditable editor wrapper for page/block outline content.
 * - Wires keyboard handlers and restores caret position after re-render.
 * Implementation notes:
 * - State is initialized from mounted JSX props and can carry a refresh source marker.
 * - Keeps a local editor element reference to avoid cross-editor caret resets.
 * Recent changes:
 * - Added explicit props/state typing and a `props` field for AppRun JSX compatibility.
 * - This fixes TS2607 on usages like `<Editor pages={...} />`.
 */
import { app, Component } from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import { restore_caret } from '../utils/caret';


type EditorProps = {
  pages?: () => any;
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

  view = ({ pages }: EditorState) => {
    const children = pages && pages();
    return <div class="editor" contenteditable="true"
      $onkeydown={editor_keydown} $onkeyup={editor_keyup}>
      {children}
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

  mounted = (props: EditorProps) => props;
}
