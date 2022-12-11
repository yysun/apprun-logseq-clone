import { app, Component, safeHTML, on } from 'apprun';
import _md from 'markdown-it';
import { data, fuse, open_file } from './data';

const highlight = (value, indeics) => {
  let result = '', match = '';
  let last = 0;
  for (const [start, end] of indeics) {
    result += value.substring(last, start);
    last = end + 1;
    match = value.substring(start, last);
    result += (end - start > 0) ? `<mark>${match} ${end - start}</mark>` : match;
  }
  result += value.substring(last);
  return result;
}

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

const create_content = content => {
  content = md.render(content);
  content = content.replace(wiki_link, (match, p1) => `<a href="#${p1}">${p1}</a>`);
  return safeHTML(content)[0];
}

const create_block = (node, hits) => {

  let { id, children } = node;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => create_block(child, hits));

  const hit = !hits || hits.find(b => b.id === id);
  node.show = hit ? true : children?.some(child => child.show);

  if (!node.show) return null;

  let content = block.content;
  content = hit?.matches ? highlight(content, hit.matches[0].indices) : content;
  content = block.type === 'page' ? `<h1>${content}</h1>` : content;
  content = create_content(content);

  return <div class={`block d-flex flex-column`}
    id={block.id}>
    <div class="d-flex">
      <div class="block-bullet">
        <div class="bullet" onclick={toggle_block_list}></div>
      </div>
      <div class="block-content flex-grow-1">{content}</div>
    </div>
    {list && <div class="block-list">{list}</div>}
  </div>;
}

const getFile = async (state) => {
  await open_file();
  return state;
}

export default class extends Component {

  @on('@search')
  search = (state, pattern) => {
    if (!pattern) return { ...state, hits: null, pattern };
    const hits = fuse.search(pattern).map(r => ({ id: r.item.id, matches: r.matches }));
    return { ...state, hits, pattern }
  }

  state = data;

  view = state => {
    const pages = state.pages || [];
    const hits = state.hits;
    const total = hits ? hits.length : data?.blocks.length;

    return pages.length > 0 ?
      <div class="page">
        <h1>All Pages ({total})</h1>
        {pages.map(page => create_block(page, hits))}
      </div> :
      <button $onclick={getFile}>Open...</button>
  }
}