import { app, Component } from 'apprun';
import Mark from 'mark.js';
import { search } from '../search';
import { find_block_path } from '../model';
import Block from './components/block-view';
import Editor from './components/editor';

const toggle_block_list = e => {
  const content_block = e.target.parentElement.querySelector('.block');
  if (content_block.style.display === 'none') {
    content_block.style.display = 'block';
    e.target.classList.remove('arrow-right');
    e.target.classList.add('arrow-down');
  } else {
    content_block.style.display = 'none';
    content_block.classList.add('hidden');
    e.target.classList.remove('arrow-down');
    e.target.classList.add('arrow-right');
  }
}

const Hit = ({ hit }) => {
  const blocks = find_block_path(hit);
  return <li class="flex mb-4">
    <div class="search-results-arrow arrow-down mt-2 mr-3" onclick={toggle_block_list}></div>
    <Block blocks={blocks} editable={true} />
  </li>
}

let marker;

export default class extends Component {

  state = { hits: [], query: '' };
  view = ({ hits, query }) => {
    hits = hits || [];
    return <div class="search-results">
      <div class="w-full flex items-center mb-4">
        <div class="flex-1">{`Found: ${hits.length}`}</div>
        <a class="toolbar-button" $onclick='add-new-page' title="add page">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-plus" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="font-size: 20px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="9" x2="12" y2="15"></line></svg>
        </a>
        <input class="px-3 py-1 rounded-md border border-gray-300" id="txtSearch"
          placeholder="search ..." value={query || ''}
          $oninput='search' />
      </div>
      <ul class="search-results-blocks">
        <Editor pages={()=>hits.map(hit => <Hit hit={hit} />)} />
      </ul>
    </div>
  };
  update = {
    'search': (_, e) => ({
      hits: search(e.target.value),
      query: e.target.value
    }),

    '@search-results': (state, hits, query) => {
      app.run('@show-right-panel')
      if (!query) return state;
      return ({ ...state, hits, query })
    },

    'add-new-page': () => {
      const input = document.getElementById('txtSearch') as HTMLInputElement;
      input.value && app.run('#page', 'pages', input.value);
    }

  }

  rendered = ({ query }) => {
    if (query) {
      marker = new Mark(".search-results-blocks");
      marker.mark(query);
    }
  }
}