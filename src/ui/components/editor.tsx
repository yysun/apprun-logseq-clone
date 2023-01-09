import app from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import Page from './page-view';

export default ({pages, editable, mode}) => {
  return <div class="editor" contenteditable="true"
    $onkeydown={editor_keydown} onkeyup={editor_keyup}>
    {pages.map(page => <Page page={page} editable={editable} mode={mode} />)}
  </div>;
};