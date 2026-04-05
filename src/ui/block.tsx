import { app, Component } from 'apprun';
import { find_block_path, data } from '../model';
import OutlinerAdapter from './components/outliner-adapter';
import type { OutlinerPage, OutlinerBlock } from 'outliner';
import { applyOutlinerChanges } from './utils/outliner-adapter';
import Log from '../logger';

/**
 * Convert a block path to an OutlinerPage
 */
function blockPathToOutlinerPage(blocks: any[]): OutlinerPage | null {
  if (!blocks || blocks.length === 0) return null;

  // Use the first block as the page (root)
  const rootBlock = blocks[0];

  // Convert remaining blocks to OutlinerBlock format
  const convertToOutlinerBlock = (block: any, depth: number): OutlinerBlock | null => {
    if (!block) return null;
    return {
      id: block.id,
      content: block.content || '',
      children: depth < blocks.length - 1 && blocks[depth + 1]
        ? [convertToOutlinerBlock(blocks[depth + 1], depth + 1)].filter(Boolean) as OutlinerBlock[]
        : (block.children || []).map((child: any) => ({
          id: child.id,
          content: child.content || '',
          children: []
        }))
    };
  };

  const outlinerBlocks = blocks.slice(1).map((block, idx) => convertToOutlinerBlock(block, idx + 1)).filter(Boolean) as OutlinerBlock[];

  return {
    id: rootBlock.id,
    title: rootBlock.content || 'Block View',
    blocks: outlinerBlocks
  };
}

export default class extends Component {
  state = '';  // block_id;

  view = block_id => {
    const blocks = find_block_path(block_id);
    if (!blocks) return <div>Block not found</div>;

    const outlinerPage = blockPathToOutlinerPage(blocks);
    if (!outlinerPage) return <div>Unable to load block</div>;

    const handlePagesChange = (pages: OutlinerPage[]) => {
      Log.info('Block changed', pages);
      applyOutlinerChanges(pages, data);
      app.run('@save-file', pages[0]?.title);
      app.run('//refresh');
    };

    return <div class="main-page px-3">
      <div class="block-view" >
        <OutlinerAdapter
          pages={[outlinerPage]}
          onPagesChange={handlePagesChange}
        />
      </div>
    </div>;
  }

  update = {
    '/block': (state, block_id) => {
      app.run('@show-right-panel');
      return block_id;
      // if (location.pathname.startsWith('/block')) return block_id || state;
    }
  }
}