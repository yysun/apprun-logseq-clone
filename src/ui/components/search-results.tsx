import { app, Component } from 'apprun';
import Mark from 'mark.js';
import { search } from '../../search';
import { find_block_path } from '../../model';
import Block from './block-view';

const Hit = ({ hit }) => {
  const blocks = find_block_path(hit);
  return <li>
    <Block blocks={blocks} />
  </li>
}

let marker;

export default class extends Component {
  view = ({ pages, hits, query }) => {
    hits = hits || [];
    return <div class="search-results">
      <div class="w-full flex">
        <span class="flex-1"></span>
        <input class="px-3 py-1 rounded-md border border-gray-300"
          placeholder="search ..." value={query || ''}
          $oninput='search' />
      </div>
      <div>{hits.length ? `Found: ${hits.length}` : ''}</div>
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

  unload = () => {
    marker = null;
  }
}