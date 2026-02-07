import { app, Component } from 'apprun';
import { find_block_path } from '../model';
import Block from './components/block-view';
import Editor from './components/editor';

export default class extends Component {
  state = '';  // block_id;

  view = block_id => {
    const blocks = find_block_path(block_id);
    if (!blocks) return <div>Block not found</div>;
    return <div class="main-page px-3">
      <div class="block-view" >
        <Editor pages={() => <Block blocks={blocks} editable={true} />} />
      </div>
    </div>;
  }

  update = {
    '/block': (state, block_id) => {
      app.run('@show-right-panel');
      return block_id;
      // if (location.pathname.startsWith('/block')) return block_id || state;
    }
  }
}