import { app, Component, on } from 'apprun';
import { data, select_file } from './data';
import search from './search';
import Page from './ui/page';

const getFile = async () => {
  await select_file();
  return data;
}

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
      </div> :
      <button $onclick={getFile}>Open...</button>
  }
}