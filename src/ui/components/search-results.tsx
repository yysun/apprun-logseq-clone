import { app, Component } from 'apprun';
import { data, find_block } from '../../model';

const Hit = ({ hit }) => {
  const block = find_block(hit);
  return <li>
    {block.content}
  </li>
}
export default class extends Component {
  view = ({ pages, hits, pattern }) => {
    hits = hits || [];
    return <div class="search-results">
      <div class="w-full flex">
        <span class="flex-1"></span>
        <input class="px-3 py-1 rounded-md border border-gray-300"
          placeholder="search ..." value={pattern || ''}
          onInput={e => app.run('@search', e.target.value)} />
      </div>
      <div>{hits.length ? `Found: ${hits.length}` : ''}</div>
      <ul>
        {hits.length ? hits.map(hit => <Hit hit={hit} />) : ''}
      </ul>
    </div>
  };
  update = {
    '@search-results': (state, hits, pattern) => {
      app.run('@show-right-panel')
      if (!pattern) return state;
      return ({ ...state, hits, pattern })
    }
  }
}