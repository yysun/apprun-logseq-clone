import { app, Component } from 'apprun';
import { find_page, add_page, find_block } from '../model';
import Editor from './components/editor';

export default class extends Component {
  state = ''; //name

  view = name => {
    const page = find_page(name);
    const block = find_block(page.id);
    return <div class="main-page px-3">
      <div contenteditable="true" $onkeydown={'change_page_name'} $onfocusout={'change_page_name'}>
        <h1 class="py-4">{block.content}</h1>
      </div>
      <Editor pages={[page]} editable={true} includePageName={false} />
    </div>;
  }

  update = {
    '#page, @refresh': (state, path, name) => {
      if (path && name) name = path + '/' + name;
      if (name === '[new]') {
        return add_page('pages/[new]', '- ', Date.now()).name;
      }
      if (location.hash.startsWith('#page')) return name || state;
    },

    'change_page_name': (state, e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log(e.target.innerText);
      }
    }
  }
}