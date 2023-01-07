import { app, Component } from 'apprun';
import { data, find_block } from '../../model';
import { search } from '../../search';

const Hit = ({ hit }) => {
  const block = find_block(hit);
  return <li>
    {block.content}
  </li>
}
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
      <ul>
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
}