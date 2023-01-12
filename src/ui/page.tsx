import { app, Component } from 'apprun';
import sanitize from 'sanitize-filename';
import { find_page, add_page, find_block } from '../model';
import Editor from './components/editor';
import Page from './components/page-view';
import Log from '../logger';

export default class extends Component {
  state = ''; //name

  view = name => {
    const page = find_page(name);
    const block = find_block(page.id);
    return <div class="main-page px-3">
      <div contenteditable="true" $onkeydown={'change_page_name'} $onfocusout={'change_page_name'}>
        <h1 class="py-4">{block.content}</h1>
      </div>
      <Editor>
        {() => <Page page={page} editable={true} includePageName={false} />}
      </Editor>
    </div>;
  }

  update = {
    '#page': (state, path, name) => {
      name = sanitize(decodeURI(name));
      app.run('@search', name);
      name = path + '/' + name;
      const page = find_page(name);
      if (!page) {
        Log.info('Creating a new page: ' + name);
        add_page(name, '- ', Date.now()).name;
      }
      return name;
    },

    'change_page_name': (state, e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log(e.target.innerText);
      }
    }
  }
}