import { app, Component } from 'apprun';
import { find_page_index } from '../model';
import Page from './components/page-view';
import { editor_keydown } from './utils/keyboard-events';

export default class extends Component {
  block_id;

  view = () => {
    const page = find_page_index(this.block_id);
    return <div class="main-page px-3" contenteditable="true"
      $onkeydown={editor_keydown}>
      <Page page={page} editable={true} mode={1} />
    </div>;
  }

  update = {
    '#page': (state, name) => {
      this.block_id = name;
      return name;
    }
  }
}