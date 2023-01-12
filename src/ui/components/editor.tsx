import { app, Component } from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import { restore_caret } from '../utils/caret';


const set_caret = (el) => {
  console.assert(document.querySelectorAll('#__caret').length <= 1, 'Too many caret');
  restore_caret(el);
}

export default class extends Component {
  editor;
  view = ({ pages }) => {
    const children = pages && pages();
    return <div class="editor" contenteditable="true"
      $onkeydown={editor_keydown} $onkeyup={editor_keyup}>
      {children}
    </div>;
  }

  update = {
    '//refresh': (state, source) => {
      if (source && this.editor && source !== this.editor) {
        // render refresh from other editors
        return ({ ...state, source })
      }
    }
  }

  rendered = state => {
    this.editor = this['element'].querySelector('.editor');
    // set caret only from own render
    !state.source && set_caret(this.editor);
  }

  mounted = props => props;
}