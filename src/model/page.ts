import _md from 'markdown-it';
import { v4 as uuidv4 } from 'uuid';
const get_id = () => uuidv4();

export const data = {
  blocks: [],
  pages: []
};

export const init_data = () => {
  data.blocks = [];
  data.pages = [];
}

const find_page = name => {
  const page_block = data.blocks.find(b => b.type === 'page' && b.page === name);
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
  } else if (!content && list) {
    content = list;
  }
  content = content ? ' '.repeat(block.level) + content : '';
  return content;
};

export const get_page_content = (name) => {
  const page = find_page(name);
  if (!page) return {}
  return create_content(page);
}

export function get_page(blocks, name, lastModified) {

  const page_blocks = [];
  const getId = block => {
    const children = block.children?.map(child => getId(child))
    get_properties(block);
    page_blocks.push({
      ...block,
      page: name,
    });
    return { id: block.id, children }
  }

  const children = blocks.map(block => getId(block))

  const page = {
    id: get_id(),
    name,
    children,
    lastModified
  };

  page_blocks.push({ id: page.id, page: name, content: name, type: 'page' });
  page_blocks.sort((a, b) => a.id.localeCompare(b.id));
  return { page, page_blocks };
}

export function get_blocks(text) {

  const lines = text.split('\n')
    .filter(line => !!line.trim())
    .map((line) => {
      if (line[0] !== ' ' && line[0] !== '\t' && line[0] !== '-') line = '- ' + line;
      return line;
    })
  text = lines.join('\n');

  const md = _md({ html: true, breaks: true, linkify: true });
  const nodes = md.parse(text, {});
  const stack = [];
  let block = { children: [] } as any;

  nodes.forEach(node => {
    switch (node.type) {

      case 'list_item_open':
        const new_block = { type: 'list-item', children: [], content: node.content };
        stack.push(block);
        block.children.push(new_block);
        block = new_block;
        break;

      case 'list_item_close':
        if (block.children.length === 0) delete block.children;
        block = stack.pop();
        break;

      case 'fence':
        block.children.push({
          type: 'code',
          content: `${node.markup}${node.info}\n${node.content}\n${node.markup}`
        });
        break;

      case 'heading_open':
        block.type = "heading";
        break;

      case 'heading_close':
        block.content = `${node.markup} ${block.content}`
        break;

      default:
        if (node.content) block.content = node.content;
        break;
    }
  });
  const blocks = block.children;
  return blocks ?? [];
}

export function get_properties(block) {
  if (block.content) {
    block.content = block.content.split('\n')
      .filter(line => {
        const is_prop = line.indexOf('::') > 0;
        if (is_prop) {
          const [key, value] = line.split('::');
          block[key.trim()] = value.trim();
        }
        return !is_prop;
      })
      .join('\n');
  }
  if (!block.id) {
    block.id = get_id();
  }
}

export function add_page(name, text, lastModified) {
  const blocks = get_blocks(text);
  const { page, page_blocks } = get_page(blocks, name, lastModified);
  data.blocks.push(...page_blocks);
  if (page?.children?.length) data.pages.push(page);
}

export function update_page(name, text, lastModified) {
  const blocks = get_blocks(text);
  const old_blocks = data.blocks.filter(b => b.page === name);
  for (let block of blocks) {
    const old_block = old_blocks.find(b => b.content === block.content);
    if (old_block) {
      block.id = old_block.id;
    } else {
      block.isNew = true;
    }
  }
  const { page, page_blocks } = get_page(blocks, name, lastModified);
  const old_page = data.pages.find(b => b.name === name);

  for (let block of old_blocks) {
    const new_block = page_blocks.find(b => b.content === block.content);
    if (!new_block) {
      block.isDeleted = true;
    }
  }
  data.blocks = data.blocks.filter(b => !b.isDeleted);
  data.blocks.push(...page_blocks.filter(b => b.isNew).map(b => {
    delete b.isNew;
    return b;
  }));

  if (old_page) {
    page.id = old_page.id;
  }
  data.pages = data.pages.filter(p => p.name !== name);
  data.pages.push(page);
}

export const delete_page = (name) => {
  data.blocks = data.blocks.filter(b => b.page !== name);
  data.pages = data.pages.filter(p => p.name !== name);
}

export const refresh_page = page => {
  const text = get_page_content(page);
  update_page(page, text, Date.now());
}