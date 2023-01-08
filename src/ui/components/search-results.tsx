import { app, Component } from 'apprun';
import Mark from 'mark.js';
import { search } from '../../search';
import { find_block_path } from '../../model';
import Block from './block-view';

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
    <Block blocks={blocks} />
  </li>
}

let marker;

export default class extends Component {
  view = ({ pages, hits, query }) => {
    hits = hits || [];
    return <div class="search-results">
      <div class="w-full flex items-center mb-4">
        <div class="flex-1">{hits.length ? `Found: ${hits.length}` : ''}</div>
        <input class="px-3 py-1 rounded-md border border-gray-300"
          placeholder="search ..." value={query || ''}
          $oninput='search' />
      </div>
      <ul class="search-results-blocks">
        {hits.length ? hits.map(hit => <Hit hit={hit} />) : ''}
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
  }

  rendered = ({ query}) => {
    marker = new Mark(".search-results-blocks");
    marker.mark(query);
  }
}