import { app } from 'apprun';
import { editor_keydown } from '../utils/keyboard-events';
import Page from './page-view';

export default function Block({ blocks }) {
  let parents, children
  if (blocks.length === 1) {
    parents = [blocks[0]];
    children = blocks[0].children;
  } else {
    parents = blocks.slice(0, blocks.length - 1);
    children = [blocks[blocks.length - 1]];
  }
  return <div class="w-full">
    <div class="breadcrum flex pb-4">
      {parents.map((p, i) => <div class="flex">
        <a href={`#block/${p.id}`}>{p.content.substring(p.content.lastIndexOf('/') + 1)}</a>
        {i !== parents.length - 1 ? <div class="breadcrum-arrow mx-2 mt-2"></div> : ''}
      </div>
      )}
    </div>
    <div contenteditable="true" $onkeydown={editor_keydown}>
      {children.map(block => <Page page={block} editable />)}
    </div>
  </div>;
}