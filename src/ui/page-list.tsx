import app from 'apprun';
import Page from './page';
import { editor_keydown } from './keyboard-events';

export default ({ pages, editable }) =>
  <div class="page-list" contenteditable={editable}
    $onkeydown={editable && editor_keydown}>
    {pages.map(page => <Page {...{ page, editable }} />)}
  </div>;
