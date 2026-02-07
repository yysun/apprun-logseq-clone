/**
 * Pages List Component for Sidebar
 * 
 * Features:
 * - Lists all pages from pages/ directory
 * - Sorted alphabetically
 * - Links to individual page views
 * - Updates reactively when pages data changes
 * 
 * State:
 * - Hidden by default (collapsed)
 * - Visibility controlled by parent sidebar component
 * - State persisted via localStorage in sidebar
 */

import { app, Component } from 'apprun';
import { data } from '../../store';

export default class extends Component {
  state = data;

  view = (state) => {
    const pages = state.pages?.filter(p => p.name.startsWith('pages/')) || [];
    const sortedPages = pages.sort((a, b) => a.name.localeCompare(b.name));

    return <div class="pages-list hidden">
      <ul class="w-full text-sm">
        {sortedPages.length > 0 ?
          sortedPages.map(page =>
            <li class="h-7 px-2 py-1 hover:bg-gray-100">
              <a href={`/page/${page.name}`} class="block truncate">
                {page.name.replace('pages/', '')}
              </a>
            </li>
          ) :
          <li class="h-7 px-2 py-1 text-gray-400 italic">No pages</li>
        }
      </ul>
    </div>
  }

  update = {
    'pages-updated': () => data
  }
}
