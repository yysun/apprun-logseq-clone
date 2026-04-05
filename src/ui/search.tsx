import { app, Component } from 'apprun';
import Mark from 'mark.js';
import { search } from '../search';
import { find_block_path, data } from '../model';
import OutlinerAdapter from './components/outliner-adapter';
import type { OutlinerPage, OutlinerBlock } from 'outliner';
import { applyOutlinerChanges } from './utils/outliner-adapter';
import Log from '../logger';

/**
 * Convert a block path to an OutlinerPage for search results
 */
function blockPathToSearchPage(blocks: any[], blockId: string): OutlinerPage | null {
  if (!blocks || blocks.length === 0) return null;

  const rootBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];

  return {
    id: blockId,
    title: rootBlock.content || 'Search Result',
    blocks: [{
      id: lastBlock.id,
      content: lastBlock.content || '',
      children: (lastBlock.children || []).map((child: any) => ({
        id: child.id,
        content: child.content || '',
        children: []
      }))
    }]
  };
}

let marker;

export default class extends Component {

  state = { hits: [], query: '' };
  view = ({ hits, query }) => {
    hits = hits || [];

    const outlinerPages: OutlinerPage[] = hits
      .map(hit => {
        const blocks = find_block_path(hit);
        return blocks ? blockPathToSearchPage(blocks, hit) : null;
      })
      .filter(Boolean) as OutlinerPage[];

    const handlePagesChange = (pages: OutlinerPage[]) => {
      Log.info('Search results changed', pages);
      applyOutlinerChanges(pages, data);
      pages.forEach(page => app.run('@save-file', page.title));
      app.run('//refresh');
    };

    return <div class="search-results">
      <div class="w-full flex items-center mb-4">
        <div class="flex-1">{`Found: ${hits.length}`}</div>
        <a class="toolbar-button" $onclick='add-new-page' title="add page">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-plus" width="20" height="20" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="font-size: 20px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="12" x2="15" y2="12"></line><line x1="12" y1="9" x2="12" y2="15"></line></svg>
        </a>
        <input class="px-3 py-1 rounded-md border border-gray-300" id="txtSearch"
          placeholder="search ..." value={query || ''}
          $oninput='search' />
      </div>
      <div class="search-results-blocks">
        {outlinerPages.length > 0 && <OutlinerAdapter
          pages={outlinerPages}
          onPagesChange={handlePagesChange}
        />}
      </div>
    </div>
  };
  update = {
    'search': (_, e) => ({
      hits: search(e.target.value),
      query: e.target.value
    }),

    '@search-results': (state, hits, query) => {
      app.run('@show-right-panel');
      if (!query) return state;
      return ({ ...state, hits, query })
    },

    'add-new-page': () => {
      const input = document.getElementById('txtSearch') as HTMLInputElement;
      input.value && app.run('/page', 'pages', input.value);
    }

  }

  rendered = ({ query }) => {
    if (query) {
      marker = new Mark(".search-results-blocks");
      marker.mark(query);
    }
  }
}