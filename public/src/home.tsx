import { app, Component, safeHTML } from 'apprun';
import _md from 'markdown-it';
import { data, open_file } from './data';

const wiki_link = /\#?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

const toggle = el => {
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

const toggle_block_list = e => {
  const target = e.target.closest('.block').querySelector('.block-list');
  if (target) {
    toggle(target);
    e.target.classList.toggle('collapsed');
  }
}

const md = _md({ html: true, breaks: true, linkify: true });

const create_content = block => {
  let content = block.content;
  content = block.type === 'page' ? `<h1>${content}</>` : md.render(content);
  content = content.replace(wiki_link, (match, p1) => `<a href="#${p1}">${p1}</a>`);
  return safeHTML(content)[0];
}

const create_block = (b, blocks) => {

  const { id, children } = b;
  let block = blocks.find(b => b.id === id);

  const ul = (children?.length) ? <div class="block-list">
    {children.map(child => create_block(child, blocks))}
  </div> : null;

  return <div class={`block d-flex flex-column`} id={block.id}>
    <div class="d-flex">
      <div class="block-bullet">
        <div class="bullet" onclick={toggle_block_list}></div>
      </div>
      <div class="block-content flex-grow-1">{create_content(block)}</div>
    </div>
    {ul ?? ''}
  </div>;
}

const getFile = async (state) => {
  await open_file();
  return state;
}

export default class extends Component {

  state = data;

  view = state => {
    const pages = state.pages || [];
    const blocks = state.blocks || [];

    return pages.length > 0 ?
      <div class="page">
        <h1>All Pages</h1>
        {pages.map(page => create_block(page, blocks)).filter(b => b)}
      </div> :
      <button $onclick={getFile}>Open...</button>
  }
}