import { app, Component, on } from 'apprun';
import { data, dirHandle, select_dir, grant_access } from './store';
import search from './search';
import Page from './ui/page';

export default class extends Component {

  @on('@search')
  search = (state, pattern) => {
    if (!pattern) return { ...state, hits: null, pattern };
    const hits = search(pattern);//.map(r => ({ id: r.item.id, matches: r.matches }));
    return { ...state, hits, pattern }
  }

  state = data;

  view = state => {
    const pages = state.pages || [];
    const total = data?.blocks.length;

    return pages.length > 0 ?
      <div class="page">
        <h1>All Pages ({total})</h1>
        {pages.map(page => <Page page={page} />)}
      </div> : !dirHandle ?
        <button $onclick={select_dir}>Open...</button> :
        <button $onclick={grant_access}>Grant access...</button>
  }
}