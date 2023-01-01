import { app, safeHTML } from 'apprun';
import { to_html } from '../model/md';
import { data } from '../store';
import { create_caret } from './caret';

const toggle = el => {
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

const toggle_block_list = e => {
  const list = e.target.closest('.block').querySelector('.block-list');
  const content = e.target.closest('.block').querySelector('.block-content');
  if (list) {
    toggle(list);
    e.target.classList.toggle('collapsed');
  }
  create_caret(content);
}

const create_content = content => {
  content = to_html(content);
  return safeHTML(content)[0];
}

export default function Page({ page }) {

  let { id, children } = page;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => <Page page={child} />);

  let content = block.content;
  if (block.type === 'page') {
    content = content.substring(content.lastIndexOf('/') + 1);
    content = `<h1 contenteditable="false">${content}</h1>`;
  }
  content = create_content(content) || ' ';

  return <div class={`block${block.type === 'page' ? ' page' : ''}`} >
    <div class="block-header" contenteditable="false">
      <div class="block-bullet">
        <div class={`bullet ${list ? 'cursor-pointer bg-gray-500' : 'cursor-default  bg-gray-300'}`}
          onclick={toggle_block_list}></div>
      </div>
      <div class="block-content" contenteditable="true" id={block.id}>
        {content}
      </div>
      <div class="block-handle"></div>
    </div>
    {list && <div class="block-list">{list}</div>}
  </div>;
}