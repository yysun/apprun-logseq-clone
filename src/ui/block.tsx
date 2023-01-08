import { app, Component } from 'apprun';
import { find_block_path } from '../model';
import Block from './components/block-view';

export default class extends Component {
  block_id;

  view = () => {
    const blocks = find_block_path(this.block_id);
    return <div class="main-page px-3">
      <Block blocks={blocks} />
    </div>;
  }

  update = {
    '#block': (state, id) => {
      this.block_id = id;
      return id;
    }
  }
}