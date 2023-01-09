import { app, Component } from 'apprun';
import { find_block_path } from '../model';
import Block from './components/block-view';

export default class extends Component {
  state = '';  // block_id;

  view = block_id => {
    const blocks = find_block_path(block_id);
    return <div class="main-page px-3">
      <Block blocks={blocks} />
    </div>;
  }

  update = {
    '#block, @refresh': (state, block_id) => {
      if (location.hash.startsWith('#block')) return block_id;
    }
  }
}