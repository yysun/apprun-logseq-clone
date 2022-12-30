import { app, safeHTML } from 'apprun';
import { to_html } from '../md';
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
  content = create_content(content);

  return <div class={`block${block.type === 'page' ? ' page' : ''}`} id={block.id}>
    <div class="block-header">
      <div class="block-bullet" contenteditable="false">
        <div class="bullet" onclick={toggle_block_list}></div>
      </div>
      <div class="block-content"
        $onfocus='@edit-block-begin'
        $onblur='@edit-block-end'
        block={block}>{content}</div>
    </div>
    {list && <div class="block-list">{list}</div>}
  </div>;
}