import app from 'apprun';
import { restore_caret } from '../utils/caret';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import Page from './page-view';

export default ({pages, editable, mode}) => {
  return <div class="editor" contenteditable={editable}
    ref = {restore_caret}
    onkeydown={editable && editor_keydown}
    onkeyup={editable && editor_keyup}>
    {pages.map(page => <Page page={page} editable={editable} mode={mode} />)}
  </div>;
};