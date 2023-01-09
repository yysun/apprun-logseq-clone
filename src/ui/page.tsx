import { app, Component } from 'apprun';
import { find_page_index } from '../model';
import Editor from './components/editor';

export default class extends Component {
  state = ''; // block_id

  view = block_id => {
    const page = find_page_index(block_id);
    return <div class="main-page px-3">
      <h1 class="py-4" contenteditable="false">{page.name}</h1>
      <Editor pages={[page]} editable={true} includePageName={false} />
    </div>;
  }

  update = {
    '#page, @refresh': (state, block_id) => {
      if (location.hash.startsWith('#page')) return block_id || state;
    }
  }
}