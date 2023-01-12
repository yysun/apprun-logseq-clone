import { app, Component } from 'apprun';
import { find_block_path } from '../model';
import Block from './components/block-view';
import Editor from './components/editor';

export default class extends Component {
  state = '';  // block_id;

  view = block_id => {
    const blocks = find_block_path(block_id);
    return <div class="main-page px-3">
      <div class="block-view" >
        <Editor>
          {() => <Block blocks={blocks} editable={true} />}
        </Editor>
      </div>
    </div>;
  }

  update = {
    '#block': (state, block_id) => {
      if (location.hash.startsWith('#block')) return block_id || state;
    }
  }
}