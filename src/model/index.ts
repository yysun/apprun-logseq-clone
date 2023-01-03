import app from 'apprun';
import _md from 'markdown-it';
import { v4 as uuidv4 } from 'uuid';
const get_id = () => uuidv4();

//#region types
type BlockRef = { id: string };
type Block = BlockRef & {
  content: string;
  page?: string;
  type?: string;
  [index: string]: any; // properties
}

type BlockId = string | Block;
type Index = BlockRef & { children?: Index[] };

type PageIndex = Index & {
  id: string;
  name: string;
  lastModified: number;
}

type BlockIndex = Index & {
  parent: Index;
  pos: number;
  page?: PageIndex;
}

type Data = {
  blocks: Block[];
  pages: PageIndex[];
}
//#endregion

export const data: Data = {
  blocks: [],
  pages: []
};

export const init_data = () => {
  data.blocks = [];
  data.pages = [];
}

export const find_page = name => {
  const page_block = data.blocks.find(b => b.type === 'page' && b.page === name);
  const page = data.pages.find(p => p.id === page_block.id);
  return page;
}

const create_content = (page, level = 0) => {
  const { id, children } = page;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => create_content(child, level + 1))
    .filter(c => !!c.trim())
    .join('\n');

  if (block.type === 'page') return list;
  const leading_spaces = ' '.repeat((level - 1) * 2);
  const content_lines = block.content.split('\n')
    .map(line => line.replace('<span id="__caret"></span>', '').trim());
  const property_lines = Object.keys(block)
    .filter(prop => prop !== 'page' && prop !== 'content' && prop !== 'type' && prop !== '_has_id')
    .map(prop => prop !== 'id' || block['_has_id'] ? prop + ':: ' + block[prop] : '')
    .map(line => line.trim())
    .filter(line => !!line);

  const all_lines = property_lines.concat(content_lines.slice(1));
  const content_rest = all_lines.map(line => leading_spaces + '  ' + line)
    .filter(line => !!line.trim())
    .join('\n');
  let content = leading_spaces + '- ' + content_lines[0] + (content_rest ? '\n' + content_rest : '');
  if (content && list) {
    content = content + '\n' + list;
  } else if (!content && list) {
    content = list;
  }
  return content;
};

export const get_page_content = (name) => {
  const page = find_page(name);
  if (!page) return {}
  return create_content(page);
}

export function parse_page(name, blocks, lastModified) {

  const page_blocks = [];
  const getId = block => {
    const children = block.children?.map(child => getId(child))
    parse_properties(block);
    const _block = {
      ...block,
      page: name,
    }
    delete _block.children;
    delete _block.type;
    page_blocks.push(_block);
    return children ? { id: block.id, children } : { id: block.id }
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

export function parse_blocks(text) {

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
        const new_block = { type: 'block', children: [], content: node.content };
        stack.push(block);
        block.children.push(new_block);
        block = new_block;
        break;

      case 'list_item_close':
        if (block.children.length === 0) delete block.children;
        block = stack.pop();
        break;

      case 'fence':
        block.content = `${node.markup}${node.info}\n${node.content}\n${node.markup}`
        block.type = "code";
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

export function parse_properties(block) {
  if (block.content) {
    block.content = block.content.split('\n')
      .filter(line => {
        const is_prop = line.indexOf(':: ') > 0;
        if (is_prop) {
          const [key, value] = line.split(':: ');
          block[key.trim()] = value.trim();
        }
        return !is_prop;
      })
      .join('\n');
  }
  if (!block.id) {
    block.id = get_id();
  } else {
    block._has_id = true;
  }
}

export function add_page(name, text, lastModified) {
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page(name, blocks, lastModified);
  data.blocks.push(...page_blocks);
  if (page?.children?.length) data.pages.push(page);
}

export function update_page(name, text, lastModified) {
  const blocks = parse_blocks(text);
  const old_blocks = data.blocks.filter(b => b.page === name);
  for (let block of blocks) {
    const old_block = old_blocks.find(b => b.content === block.content);
    if (old_block) {
      block.id = old_block.id;
    } else {
      block.isNew = true;
    }
  }
  const { page, page_blocks } = parse_page(blocks, name, lastModified);
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


//#region block functions

export const find_block = (id: string): Block => {
  return data.blocks.find(b => b.id === id);
}

export const create_block = (content: string): Block => {
  if (!content) content = '- '
  const block = parse_blocks(content)[0];
  parse_properties(block);
  data.blocks.push(block);
  return block;
}

export const delete_block = (block) => {
  const { parent, pos } = find_block_index(block);
  parent.children.splice(pos, 1);
  data.blocks = data.blocks.filter(b => b.id !== block.id);
}

export const update_block = (block: BlockId, content: string) => {
  block = find_block(get_block_id(block));
  if (!block || block.content === content) return;
  block.content = content;
  app.run('save-file', block.page);
}

//#endregion

//#region index functions
export const get_block_id = (block: BlockId): string => {
  return typeof block === 'string' ? block : block.id;
}

export const find_block_page = (block: BlockId): string => {
  return typeof block === 'string' ?
    data.blocks.find(b => b.id === block)?.page :
    block.page;
}

export const find_page_index = (block: BlockId): PageIndex => {
  const page = find_block_page(block);
  const page_index = data.pages.find(p => p.name === page);
  return page_index;
}

export const search_index = (parent: Index, id: string): BlockIndex => {
  if (!parent?.children) return null;
  const pos = parent.children.findIndex(c => c.id === id);
  if (pos > -1) return { parent, pos, id, children: parent.children[pos].children };
  let found;
  parent.children.every(child => {
    found = search_index(child, id);
    return !found;
  });
  return found;
}

export const find_block_index = (block: BlockId): BlockIndex => {
  block = typeof block === 'string' ? find_block(block) : block;
  const page = find_page_index(block);
  let found = search_index(page, block.id);
  if (found) return { ...found, page };
}

export const indent_block = (id: string): string | undefined => {
  const { parent, pos, page, children } = find_block_index(id);
  if (pos > 0) {
    const prev = parent.children[pos - 1];
    prev.children = prev.children || [];
    prev.children.push({ id, children });
    parent.children.splice(pos, 1);
    app.run('save-file', page.name);
    return id;
  }
}

export const outdent_block = (id: string): string | undefined => {
  const { parent, pos, page, children } = find_block_index(id);
  if (parent.id !== page.id) {
    const { parent: parent_parent, pos: parent_pos } = find_block_index(parent.id);
    parent_parent.children.splice(parent_pos + 1, 0, { id, children });
    parent.children.splice(pos, 1);
    app.run('save-file', page.name);
    return id;
  }
}

export const split_block = (id: string, part1: string, part2: string): Block => {
  const { parent, pos, page, children } = find_block_index(id);
  const old_block = find_block(id);
  if (!part1) { // at beginning of block
    const new_block = create_block(part1);
    parent.children.splice(pos, 0, { id: new_block.id });
    new_block.page = page.name;
    update_block(old_block, part2);
    return old_block;
  } else {
    const new_block = create_block(part2);
    new_block.page = page.name;
    update_block(old_block, part1);
    if (children) {
      parent.children[pos].children.unshift({ id: new_block.id });
    } else {
      parent.children.splice(pos + 1, 0, { id: new_block.id });
    }
    return new_block;
  }
}

export const merge_block = (id1: string, id2: string): Block => {
  const block1 = find_block(id1);
  const block2 = find_block(id2);
  update_block(block1, block1.content + '<span id="__caret"></span>' + block2.content);
  delete_block(block2);
  return block1;
}

export const move_block = (id: string, target: BlockId) => {
}

//#endregion
