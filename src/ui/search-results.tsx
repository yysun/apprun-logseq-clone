import { app, Component } from 'apprun';
import { data, find_block } from '../model';

const Hit = ({ hit }) => {
  const block = find_block(hit);
  return <li>
    {block.content}
  </li>
}
export default class extends Component {
  state = data
  view = ({ pages, hits, pattern }) => {
    if (!hits?.length) return;
    return <div class="search-results">
      <div>{pattern}: {hits.length}</div>
      <ul>
        {hits.map(hit => <Hit hit={hit} />)}
      </ul>
    </div>
  };
  update = {
    '@search-results': (state, hits, pattern) => {
      app.run('@show-right-panel')
      return ({ ...state, hits, pattern })
    }
  }
}