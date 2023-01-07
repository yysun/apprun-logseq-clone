import { app, Component } from 'apprun';
import { find_block_path } from '../model';
import Block from './components/block-view';

export default class extends Component {
  block_id;

  view = () => {
    const blocks = find_block_path(this.block_id);
    console.log(blocks);
    return <Block blocks={blocks} />;
  }

  update = {
    '#block': (state, id) => {
      this.block_id = id;
      return id;
    }
  }
}