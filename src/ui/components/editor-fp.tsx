import { app, Component } from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import { restore_caret } from '../utils/caret';

let active_editor;

const set_caret = (el) => {
  console.assert(document.querySelectorAll('#__caret').length <= 1, 'Too many caret');
  restore_caret(el);
}

export default ({ pages }) => {
  return <div class="editor" contenteditable="true" ref={el => el === active_editor && set_caret(el)}
    $onkeydown={editor_keydown} $onkeyup={editor_keyup}
    onmousedown={e => active_editor = e.target}>
    {pages}
  </div>;
}

  // update = {
  //   '//refresh': (state, source) => {
  //     if (source && this.editor && source !== this.editor) {
  //       // render refresh from other editors
  //       return ({ ...state, source })
  //     }
  //   }
  // }

  // rendered = state => {
  //   this.editor = this['element'].querySelector('.editor');
  //   // set caret only from own render
  //   !state.source && set_caret(this.editor);
  // }
