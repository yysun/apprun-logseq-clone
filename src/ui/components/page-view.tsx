import { app, safeHTML } from 'apprun';
import { to_html } from '../utils/md';
import { data, remove_caret_span } from '../../model';
import { create_caret } from '../utils/caret';
import { editor_drag, editor_drag_over, editor_drop } from '../utils/mouse-events';

const toggle = el => {
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

const toggle_block_list = e => {
  const list = e.target.closest('.block').querySelector('.block-list');
  const content = e.target.closest('.block').querySelector('.block-content');
  if (list) {
    toggle(list);
    e.target.classList.toggle('collapsed');
    if (list.style.display === 'none') {
      e.target.classList.remove('arrow-down');
      e.target.classList.add('arrow-right');
    } else {
      e.target.classList.remove('arrow-right');
      e.target.classList.add('arrow-down');
    }
  }
  create_caret(content);
}

const create_content_html = content => {
  content = to_html(content);
  return safeHTML(content)[0];
}

export default function Page({ page: blockIndex, editable, includePageName }) {

  const bullet_mousedown = e => {
    const block = e.target.closest('.block');
    if (!block || !editable) return;
    // block.draggable = true;
    // Object.assign(block, {ondrag, ondragover, ondrop});
  };

  const bullet_mouseup = e => {
    const block = e.target.closest('.block');
    if (!block) return;
    block.draggable = false;
  }

  let { id, children } = blockIndex;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => <Page page={child} editable={editable} includePageName={includePageName} />);
  if (list?.length === 0) list = null;
  let content = block.content;

  if (!includePageName && block.type === 'page') return <div>
    {/* <h1 class="py-4" contenteditable="false">{content}</h1> */}
    {list && <div class="">{list}</div>}
  </div>;

  if (block.type === 'page') {
    content = <h1 class="py-4" contenteditable="false"><a href={`#page/${blockIndex.name}`}>{content}</a></h1>;
  } else {
    content = create_content_html(content) || <p></p>
  }

  block.content = remove_caret_span(block.content);
  return <div class={`block${block.type === 'page' ? ' page' : ''}`}>
    <div class="block-header" contenteditable="false">
      <div class="block-bullet flex items-center w-7">
        <div class={`bullet-arrow ${list ? 'arrow-down has-child' : 'arrow-right'}`} onclick={toggle_block_list}>
        </div>
        <a href={`#block/${block.id}`} data-is-block="true">
          <div class={`bullet ${list ? 'bg-gray-300' : 'bg-gray-100'}`}></div>
        </a>
      </div>
      <div class="block-content" contenteditable={editable} id={block.id}>
        {content}
      </div>
      <div class="block-handle"></div>
    </div>
    {list && <div class="block-list">{list}</div>}
  </div >;
}