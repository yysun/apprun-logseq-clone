import { app, Component, on } from 'apprun';
import { format } from 'date-fns';
import { data, dirHandle, select_dir, grant_access, new_page } from '../store';
import PageList from './components/page-list';

export default class extends Component {

  @on('#journals, @refresh')
  show = () => {
    let pages = data.pages?.filter(p => p.name.startsWith('journals/')) || [];
    const today = format(new Date(), 'yyyy_MM_dd');
    if (!pages.some(p => p.name === `journals/${today}`)) {
      new_page(`journals/${today}`, '- ');
    }
    pages = data.pages?.filter(p => p.name.startsWith('journals/'));
    return data;
  }

  state = data;

  view = ({ pages }) => {
    pages = data.pages?.filter(p => p.name.startsWith('journals/'));
    pages = pages.sort((a, b) => b.name.localeCompare(a.name));
    const total = pages.length;
    return pages.length > 0 ?
      <div class="main-page px-3">
        <h1 class="pb-4">Journals ({total})</h1>
        <PageList pages={pages} editable></PageList>
      </div> : !dirHandle ?
        <button $onclick={select_dir}>Open...</button> :
        <button $onclick={grant_access}>Grant access...</button>
  }

}