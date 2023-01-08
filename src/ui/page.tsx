import { app, Component } from 'apprun';
import { find_page_index } from '../model';
import Page from './components/page-view';

export default class extends Component {
  block_id;

  view = () => {
    const page = find_page_index(this.block_id);
    return <div class="main-page px-3">
      <Page page={page} editable />
    </div>;
  }

  update = {
    '#page': (state, name) => {
      this.block_id = name;
      return name;
    }
  }
}