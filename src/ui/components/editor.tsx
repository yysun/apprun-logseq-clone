import app from 'apprun';
import { editor_keydown, editor_keyup } from '../utils/keyboard-events';
import Page from './page-view';
export default ({ pages, editable, includePageName }) => {
  return <div class="editor" contenteditable={editable}
    onkeydown={editable && editor_keydown} onkeyup={editable && editor_keyup}>
    {pages.map(page => <Page page={page} editable={editable} includePageName={includePageName} />)}
  </div>;
};