import { app, Component, safeHTML } from 'apprun';
import _md from 'markdown-it';

import data from './data.json';

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

const create_content = id => {
  const block = data.blocks.find(b => b.id === id);
  if (!block) return '';
  let content = block.content;
  content = block.type === 'page' ? `<h1>${content}</>` : md.render(content);
  content = content.replace(wiki_link, (match, p1) => `<a href="#${p1}">${p1}</a>`);
  return safeHTML(content)[0];
}

const create_block = page => {

  const { id, name, children } = page;
  const ul = (children?.length) ? <div class="block-list">
    {children.map(child => create_block(child))}
  </div> : null;

  return <div class="block d-flex flex-column" style={`padding-left: 20px`}>
    <div class="d-flex">
      <div class="block-bullet">
        <div class="bullet" onclick={toggle_block_list}></div>
      </div>
      <div class="block-content flex-grow-1">{create_content(id)}</div>
    </div>
    {ul ?? ''}
  </div>;
}

export default class Comic extends Component {
  state = data.pages.reverse();

  view = state => <div class="page">
    <h1>All Pages</h1>
    {state.map(page => create_block(page))}
  </div>;
}