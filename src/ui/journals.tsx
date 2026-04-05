/**
 * Features:
 * - Renders journal pages sorted by date and shows a total count.
 * - Ensures today's journal page exists when visiting the journals route.
 * Implementation notes:
 * - Uses OutlinerAdapter with multiple pages for editable outline behavior.
 * Recent changes:
 * - Migrated from old Editor to OutlinerAdapter component.
 */
import { app, Component } from 'apprun';
import { format } from 'date-fns';
import { data, add_page } from '../model';
import OutlinerAdapter from './components/outliner-adapter';
import { pageIndexToOutlinerPage, applyOutlinerChanges } from './utils/outliner-adapter';
import type { OutlinerPage } from 'outliner';
import Log from '../logger';

export default class extends Component {
  is_global_event = () => true;
  state = data;
  view = (data) => {
    const journalPages = data.pages?.filter(p => p.name.startsWith('journals/'))
      .sort((a, b) => b.name.localeCompare(a.name)) || [];

    const total = journalPages.length;

    if (total === 0) {
      return <div>No journals found</div>;
    }

    const outlinerPages: OutlinerPage[] = journalPages.map(pageIndexToOutlinerPage);

    const handlePagesChange = (pages: OutlinerPage[]) => {
      Log.info('Journal pages changed', pages);
      applyOutlinerChanges(pages, data);
      pages.forEach(page => app.run('@save-file', page.title));
      app.run('//refresh');
    };

    return <div class="main-page px-3">
      <h1 class="pb-4">Journals ({total})</h1>
      <div class="page-list" >
        <OutlinerAdapter
          pages={outlinerPages}
          onPagesChange={handlePagesChange}
        />
      </div>
    </div>;
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
