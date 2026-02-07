import { app, Component } from 'apprun';
import { format } from 'date-fns';
import { data, add_page } from '../model';
import Editor from './components/editor';
import Page from './components/page-view';

export default class extends Component {
  is_global_event = () => true;
  state = data;
  view = (data) => {
    const pages = () => data.pages?.filter(p => p.name.startsWith('journals/'))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(page => <Page page={page} editable={true} includePageName={true} />)

    const total = pages().length;
    return total > 0 ?
      <div class="main-page px-3">
        <h1 class="pb-4">Journals ({total})</h1>
        <div class="page-list" >
          <Editor pages={pages} />
        </div>
      </div> : <div>No journals found</div>;
  }

  update = {
    '/journals': () => {
      let pages = data.pages?.filter(p => p.name.startsWith('journals/')) || [];
      const today = format(new Date(), 'yyyy_MM_dd');
      if (!pages.some(p => p.name === `journals/${today}`)) {
        add_page(`journals/${today}`, '- ', Date.now());
      }
      if (location.pathname.startsWith('/journals')) return data;
    },
    'dir-processed': () => {
      if (location.pathname.startsWith('/journals')) return data;
    }
  }

}