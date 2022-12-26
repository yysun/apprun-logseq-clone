import { app, Component, on } from 'apprun';
import { data, dirHandle, select_dir, grant_access, new_page } from '../store';
import Page from './page';

export default class extends Component {

  @on('#journals')
  show = () => {
    let pages = data.pages?.filter(p => p.name.startsWith('journals/')) || [];
    const date = new Date();
    const today = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
    if (!pages.some(p => p.name === `journals/${today}`)) {
      new_page(`journals/${today}`, '- ');
    }
    pages = data.pages?.filter(p => p.name.startsWith('journals/'))
      .sort((a, b) => b.name.localeCompare(a.name));
    return { pages };
  }

  state = data;

  view = ({ pages }) => {
    const total = pages.length;
    return pages.length > 0 ?
      <div class="main-page">
        <h1>Journals ({total})</h1>
        {pages.map(page => <Page page={page} />)}
      </div> : !dirHandle ?
        <button $onclick={select_dir}>Open...</button> :
        <button $onclick={grant_access}>Grant access...</button>
  }

}