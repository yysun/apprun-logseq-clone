import app from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import { restore_caret } from '../utils/caret';

const create_caret_cleanup = (el) => {
  console.assert(document.querySelectorAll('#__caret').length <= 1, 'Too many caret');
  restore_caret(el);
}

export default ({ children }) => {
  return <div class="editor" contenteditable="true" ref={create_caret_cleanup}
    onkeydown={editor_keydown} onkeyup={editor_keyup}>
    {children}
  </div>;
};