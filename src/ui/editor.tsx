import { app, Component } from 'apprun';
import { editor_keydown } from './keyboard-events';
import { editor_drag, editor_drag_over, editor_drop } from './mouse-events';

export default class extends Component {
  view = ({ children }) => {
    return <div class="editor" contenteditable="true" $onkeydown={editor_keydown}>
      {children}
    </div>;
  }

  rendered = () => {
    const blocks = this['element'].querySelectorAll('.block');
    for (const block of blocks) {
      block.addEventListener('drag', editor_drag);
      block.addEventListener('dragover', editor_drag_over);
      block.addEventListener('drop', editor_drop);
    }
  }

  unload = () => {
    const blocks = this['element'].querySelectorAll('.block');
    for (const block of blocks) {
      block.removeEventListener('drag', editor_drag);
      block.removeEventListener('dragover', editor_drag_over);
      block.removeEventListener('drop', editor_drop);
    }
  }
}