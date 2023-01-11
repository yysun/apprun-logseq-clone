import { app, Component } from 'apprun';
import { format } from 'date-fns';
import { data, new_page } from '../store';
import Editor from './components/editor';
import Page from './components/page-view';

export default class extends Component {

  state = data;
  view = (data) => {
    let pages = data.pages?.filter(p => p.name.startsWith('journals/'))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(page => <Page page={page} editable={true} includePageName={true} />)

    const total = pages.length;
    return pages.length > 0 ?
      <div class="main-page px-3">
        <h1 class="pb-4">Journals ({total})</h1>
        <div class="page-list" >
          <Editor children={pages} />
        </div>
      </div> : <div>No journals found</div>;
  }

  update = {
    '#journals, @refresh': () => {
      let pages = data.pages?.filter(p => p.name.startsWith('journals/')) || [];
      const today = format(new Date(), 'yyyy_MM_dd');
      if (!pages.some(p => p.name === `journals/${today}`)) {
        new_page(`journals/${today}`, '- ');
      }
      if (location.hash.startsWith('#journals')) return data;
    }
  }

}