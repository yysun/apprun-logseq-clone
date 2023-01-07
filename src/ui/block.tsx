import { app, Component } from 'apprun';
import { find_block_index, find_page_index, find_block_parents } from '../model';
import Page from './components/page';

const Breadcrum = ({ parent }) => {
  const namespaces = parent.content.split('/');
  const name = namespaces[namespaces.length - 1];
  namespaces.pop();
  const nslinks = namespaces.map(n => <div class="flex">
    <a href={`#${n}`}>{n}</a>
    <div class="breadcrum-arrow mx-2 mt-2"></div>
  </div>)
  return <div class="flex">
    {namespaces.length > 0 && nslinks}
    <a href={`#block/${parent.id}`}>{name}</a>
    <div class="breadcrum-arrow mx-2 mt-2"></div>
  </div>;
};

export default class extends Component {
  state = {}

  view = block => <div class="main-page px-3">
    <div class="breadcrum flex pb-4">
      {block.parents.map(p => <Breadcrum parent={p} />)}
    </div>
    <div><Page page={block} editable /></div>
  </div>

  update = {
    '#block': (_, id) => {
      const block = find_block_index(id);
      if (!block) {
        const page = find_page_index(id);
        console.log(page);
        return page && { ...page, parents: [] };
      }
      const parents = find_block_parents(id);
      return { ...block, parents };
    }
  }
}