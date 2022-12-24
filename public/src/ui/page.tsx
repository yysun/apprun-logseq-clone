import { app, Component, safeHTML, on } from 'apprun';
import { to_html } from '../md';
import { data } from '../store';

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

const create_content = content => {
  content = to_html(content);
  return safeHTML(content)[0];
}
export default class Page extends Component {

  // @on('@refresh-page')
  // refresh = ({ page }, new_page) => {
  //   if (page.id === new_page.id) {
  //     return { page: new_page };
  //   }
  // }

  view = ({ page }) => {

    let { id, children } = page;
    const block = data.blocks.find(b => b.id === id);
    let list = children?.map(child => <Page page={child} />);
    let content = block.content;
    // content = block.type === 'page' ? `<h1>${content}</h1>` : content;

    content = create_content(content);

    return <div class={`block`}
      id={block.id}>
      <div class="block-header">
        <div class="block-bullet">
          <div class="bullet" onclick={toggle_block_list}></div>
        </div>
        <div class="block-content" contenteditable="true"
          $onfocus='@edit-block-begin'
          $onblur='@edit-block-end'
          block={block}>{content}</div>
      </div>
      {list && <div class="block-list">{list}</div>}
    </div>;

  }
}