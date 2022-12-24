import { data } from '../store';

const find_page = block => {
  const page_block = data.blocks.find(b => b.type === 'page' && b.page === block.page);
  const page = data.pages.find(p => p.id === page_block.id);
  return page;
}

const create_content = page => {
  const { id, children } = page;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => create_content(child))
    .filter(c => !!c)
    .join('\n');

  let content = block.type === 'page' ? '' : block.content;

  if (content && list) {
    content = content + '\n' + list;
  } else if (!content) {
    content = list;
  } 
  content = ' '.repeat(block.level) + content;
  return content;
};

export const get_page = (block) => {
  const page = find_page(block);
  if (!page) return {}
  const content = create_content(page);
  return {
    file_name: `${block.page}.md`,
    content
  }
}