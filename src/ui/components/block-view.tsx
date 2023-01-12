import { app } from 'apprun';
import Page from './page-view';

function BlockTrail({ blocks }) {

  return <div class="breadcrum flex pb-4">
    {blocks.map((p, i) => <div class="flex">
      <a href={`#block/${p.id}`} data-is-block="true">{p.content.substring(p.content.lastIndexOf('/') + 1)}</a>
      {i !== blocks.length - 1 ? <div class="breadcrum-arrow mx-2 mt-2"></div> : ''}
    </div>
    )}
  </div>;
}

export default function Block({ blocks, editable }) {
  let parents, children
  if (blocks.length === 1) {
    parents = [blocks[0]];
    children = blocks[0].children;
  } else {
    parents = blocks.slice(0, blocks.length - 1);
    children = [blocks.at(-1)];
  }
  return <div class="w-full">
    <BlockTrail blocks={parents} />
    <Page page={children[0]} editable={editable} includePageName={false} />
  </div>;
}