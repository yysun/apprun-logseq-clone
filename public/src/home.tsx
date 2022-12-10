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
  let content = data.blocks.find(b => b.id === id)?.content;
  if (!content) return '';
  content = md.render(content);
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
      <div class="block-content flex-grow-1">{create_content(id) || name}</div>
    </div>
    {ul ?? ''}
  </div>;
}

export default class Comic extends Component {
  state = data.pages.reverse();

  view = state => <div class="page">
    <div class="">All Pages</div>
    {state.map(page => create_block(page))}
  </div>;
}