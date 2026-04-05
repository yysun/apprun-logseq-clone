/**
 * Utilities to convert between the app's data model and Outliner component format
 */
import type { OutlinerBlock, OutlinerPage } from 'outliner';
import type { Block, PageIndex, Index, Data } from '../../model';
import { data } from '../../model';

/**
 * Convert an Index tree to OutlinerBlock format
 */
function indexToOutlinerBlock(index: Index, blocks: Block[]): OutlinerBlock {
  const block = blocks.find(b => b.id === index.id);
  if (!block) {
    throw new Error(`Block not found: ${index.id}`);
  }

  return {
    id: block.id,
    content: block.content,
    children: (index.children || []).map(child => indexToOutlinerBlock(child, blocks))
  };
}

/**
 * Convert a PageIndex to OutlinerPage format
 */
export function pageIndexToOutlinerPage(pageIndex: PageIndex): OutlinerPage {
  const pageBlock = data.blocks.find(b => b.id === pageIndex.id);
  if (!pageBlock) {
    throw new Error(`Page block not found: ${pageIndex.id}`);
  }

  return {
    id: pageIndex.id,
    title: pageBlock.content,
    blocks: (pageIndex.children || []).map(child => indexToOutlinerBlock(child, data.blocks))
  };
}

/**
 * Convert all pages to OutlinerPage format
 */
export function dataToOutlinerPages(pageData: Data = data): OutlinerPage[] {
  return pageData.pages.map(pageIndexToOutlinerPage);
}

/**
 * Convert a single page to OutlinerPage format
 */
export function pageToOutlinerPage(pageName: string): OutlinerPage | null {
  const page = data.pages.find(p => p.name === pageName);
  if (!page) {
    return null;
  }
  return pageIndexToOutlinerPage(page);
}

/**
 * Update the data model from OutlinerPage changes
 * This is a simplified version - in production you'd want more sophisticated merging
 */
export function updateDataFromOutlinerPages(pages: OutlinerPage[]): void {
  // This is a placeholder - the actual implementation would need to:
  // 1. Preserve block properties that aren't in the outliner format
  // 2. Handle block additions/deletions
  // 3. Update the index structure
  // 4. Trigger appropriate saves

  console.warn('updateDataFromOutlinerPages not fully implemented yet');

  // For now, just log the changes
  console.log('Pages changed:', pages);
}

/**
 * Convert OutlinerBlock back to Block and Index structures
 */
function outlinerBlockToData(
  outlinerBlock: OutlinerBlock,
  parentId: string,
  pageName: string,
  existingBlocks: Map<string, Block>
): { block: Block; index: Index } {
  // Try to preserve existing block if it exists
  const existingBlock = existingBlocks.get(outlinerBlock.id);

  const block: Block = {
    ...existingBlock,
    id: outlinerBlock.id,
    content: outlinerBlock.content,
    page: pageName,
  };

  const children = outlinerBlock.children.map((child: OutlinerBlock) =>
    outlinerBlockToData(child, outlinerBlock.id, pageName, existingBlocks)
  );

  return {
    block,
    index: {
      id: outlinerBlock.id,
      children: children.map((c: ReturnType<typeof outlinerBlockToData>) => c.index)
    }
  };
}

/**
 * Helper to batch update blocks from outliner changes
 */
export function applyOutlinerChanges(pages: OutlinerPage[], targetData: Data = data): void {
  const existingBlocks = new Map(
    targetData.blocks.map(b => [b.id, b])
  );

  const newBlocks: Block[] = [];
  const newPages: PageIndex[] = [];

  pages.forEach(page => {
    const pageBlock: Block = {
      id: page.id,
      content: page.title,
      type: 'page',
      page: page.title,
    };
    newBlocks.push(pageBlock);

    const childrenData = page.blocks.map((block: OutlinerBlock) =>
      outlinerBlockToData(block, page.id, page.title, existingBlocks)
    );

    childrenData.forEach(({ block }: ReturnType<typeof outlinerBlockToData>) => newBlocks.push(block));

    const pageIndex: PageIndex = {
      id: page.id,
      name: page.title,
      lastModified: Date.now(),
      children: childrenData.map(({ index }: ReturnType<typeof outlinerBlockToData>) => index)
    };
    newPages.push(pageIndex);
  });

  // Update the data
  targetData.blocks = newBlocks;
  targetData.pages = newPages;
}
