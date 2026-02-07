import { app, Component } from 'apprun';
import { data, dirHandle, select_dir, grant_access } from '../store';

export default class extends Component {

  state = data;

  view = ({ pages }) => {
    pages = data.pages?.filter(p => p.name.startsWith('pages/')) || [];
    pages = pages.sort((a, b) => b.name.localeCompare(a.name));
    const total = pages.length;

    return pages.length > 0 ?
      <div class="main-page">
        <h1 class="pb-4">All Pages ({total})</h1>
        <div class="all-pages">
          {pages.map(page => <li>
            <a href={`/page/${page.name}`}>{page.name}</a>
          </li>)}
        </div>
      </div> : !dirHandle ?
        <button $onclick={select_dir}>Open...</button> :
        <button $onclick={grant_access}>Grant access...</button>
  }

  update = {
    '/pages': () => data
  }

}


