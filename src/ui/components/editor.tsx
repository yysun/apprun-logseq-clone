import app from 'apprun';
import { editor_keydown } from '../utils/keyboard-events';
import Page from './page-view';
export default ({ pages, editable, includePageName }) => {
  return <div class="editor" contenteditable={editable}
    onkeydown={editable && editor_keydown}>
    {pages.map(page => <Page page={page} editable={editable} includePageName={includePageName} />)}
  </div>;
};