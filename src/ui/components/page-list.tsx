import app from 'apprun';
import Page from './page-view';
import { editor_keydown } from '../utils/keyboard-events';

export default ({ pages, editable }) =>
  <div class="page-list" contenteditable={editable}
    $onkeydown={editable && editor_keydown}>
    {pages.map(page => <Page {...{ page, editable }} />)}
  </div>;
