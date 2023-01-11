import app from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';

export default ({ children }) => {
  return <div class="editor" contenteditable="true"
    onkeydown={editor_keydown} onkeyup={editor_keyup}>
    {children}
  </div>;
};