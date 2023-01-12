import app from 'apprun';
import { parse_page, parse_blocks, parse_properties } from './parser';

//#region types
export type Block = {
  id: string;
  content: string;
  [index: string]: any; // properties
}
export type BlockId = string | Block;

export type Index = {
  id: string;
  children?: Index[]
};

export type PageIndex = Index & {
  name: string;
  lastModified: number;
}

export type BlockIndex = Index & {
  parent: Index;
  pos: number;
  page?: PageIndex;
}

export type Data = {
  blocks: Block[];
  pages: PageIndex[];
}
//#endregion

const CREATE_SPAN = '<span id="__caret"></span>';
export const data: Data = {
  blocks: [],
  pages: []
};

export const init_data = () => {
  data.blocks = [];
  data.pages = [];
}

export const remove_caret_span = text => text.replaceAll(CREATE_SPAN, '');

export const find_page = (name: string): PageIndex => {
  const page_block = data.blocks.find(b => b.type === 'page' && b.page === name);
  if (!page_block) return null;
  const page = data.pages.find(p => p.id === page_block.id);
  return page;
}

export const create_page_markdown = (page, level = 0) => {
  const { id, children } = page;
  const block = data.blocks.find(b => b.id === id);
  let list = children?.map(child => create_page_markdown(child, level + 1))
    // .filter(c => !!c.trim())
    .join('\n');

  if (block.type === 'page') return list;
  const leading_spaces = ' '.repeat((level - 1) * 2);
  const content_lines = block.content.split('\n')
    .map(line => remove_caret_span(line).trim());
  const property_lines = Object.keys(block)
    .filter(prop => prop !== 'page' && prop !== 'content' && prop !== 'type' && prop !== '_has_id')
    .map(prop => prop !== 'id' || block['_has_id'] ? prop + ':: ' + block[prop] : '')
  // .map(line => line.trim())
  // .filter(line => !!line);

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

export const get_page_markdown = (name) => {
  const page = find_page(name);
  if (!page) return {}
  return create_page_markdown(page);
}

export function add_page(name, text, lastModified): PageIndex {
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page(name, blocks, lastModified);
  data.blocks.push(...page_blocks);
  if (page?.children?.length) data.pages.push(page)
  return page;
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

export const create_block = (content: string, page: string): Block => {
  if (!content) content = '- '
  const block = parse_blocks(content)[0];
  parse_properties(block);
  block.page = page;
  data.blocks.push(block);
  return block;
}

export const delete_block = (id: string) => {
  const blockIndex = find_block_index(id);
  if (blockIndex) {
    const { parent, pos } = blockIndex
    parent.children.splice(pos, 1);
  }
  data.blocks = data.blocks.filter(b => b.id !== id);
}

export const update_block = (block: BlockId, content: string) => {
  block = find_block(get_block_id(block));
  if (!block || block.content === content) return;
  block.content = content;
  app.run('@save-file', block.page);
}

//#endregion

//#region index functions

const create_index = ({ id, children }): Index =>
  children ? { id, children } : { id };

const remove_from_parent = (index: BlockIndex): void => {
  index.parent.children.splice(index.pos, 1);
}
const add_prev_sibling = (index: BlockIndex, new_index: Index): void => {
  index.parent.children.splice(index.pos, 0, new_index);
}
const add_next_sibling = (index: BlockIndex, new_index: Index): void => {
  index.parent.children.splice(index.pos + 1, 0, new_index);
}

const insert_child = (index: Index, new_index: Index): void => {
  index.children = index.children || [];
  index.children.unshift(new_index);
}
const append_child = (index: Index, new_index: Index): void => {
  index.children = index.children || [];
  index.children.push(new_index);
}
const prev_index = (index: BlockIndex): Index => index.parent.children[index.pos - 1];
const next_index = (index: BlockIndex): Index => index.parent.children[index.pos + 1];

const isTopLevel = ({ parent, page }) => parent.id === page.id;
const isLast = ({ parent, pos }) => pos === parent.children.length - 1;
const isFirst = ({ parent, pos }) => pos === 0 && !!parent;

export const get_block_id = (block: BlockId): string => {
  return typeof block === 'string' ? block : block.id;
}

export const find_page_name = (block: BlockId): string => {
  return typeof block === 'string' ?
    data.blocks.find(b => b.id === block)?.page :
    block.page;
}

export const find_page_index = (block: BlockId): PageIndex => {
  const page = find_page_name(block);
  const page_index = data.pages.find(p => p.name === page);
  return page_index;
}

export const search_index = (parent: Index, id: string): BlockIndex => {
  if (!parent?.children) return null;
  const pos = parent.children.findIndex(c => c.id === id);
  if (pos > -1) return {
    parent, pos, id,
    get children() { return parent.children[pos].children },
    set children(children) { parent.children[pos].children = children }
  };
  let found;
  parent.children.every(child => {
    found = search_index(child, id);
    return !found;
  });
  return found;
}

export const find_block_index = (block: BlockId): BlockIndex => {
  block = typeof block === 'string' ? find_block(block) : block;
  if (!block) return null;
  const page = find_page_index(block);
  // if (block.id === page.id) return page; TODO: fix this
  let found = search_index(page, block.id);
  if (found) found.page = page;
  return found;
}

export const find_block_path = (id: BlockId): (Block & Index)[] => {
  const block_id = get_block_id(id);
  const page_index = find_page_index(block_id);
  const block = find_block(block_id);
  if (block_id === page_index.id) {
    return [{ ...block, ...page_index }];
  }
  const index = find_block_index(block);
  const parents = [{ ...block, children: index.children }];
  let { parent } = index;
  do {
    const p_block = find_block(parent.id);
    parents.unshift({ ...p_block, children: [] });
    parent = find_block_index(parent.id)?.parent
  } while (parent)
  return parents;
}

export const indent_block = (id: string): boolean => {
  const { parent, pos, page, children } = find_block_index(id);
  if (pos > 0) {
    const prev = parent.children[pos - 1];
    prev.children = prev.children || [];
    prev.children.push({ id, children });
    parent.children.splice(pos, 1);
    app.run('@save-file', page.name);
    return true;
  }
}

export const outdent_block = (id: string): boolean => {
  const blockIndex = find_block_index(id);
  const { parent, pos, page } = blockIndex;
  if (parent.id !== page.id) {
    const { parent: parent_parent, pos: parent_pos } = find_block_index(parent.id);
    const children = blockIndex.children || [];
    const siblings = parent.children.slice(pos + 1);
    if (siblings.length) children.push(...siblings);
    parent_parent.children.splice(parent_pos + 1, 0, { id, children });
    parent.children.splice(pos, siblings.length + 1);
    app.run('@save-file', page.name);
    return true;
  }
}

export const split_block = (id: string, part1: string, part2: string): boolean => {
  const old_block = find_block(id);
  part2 = remove_caret_span(part2);
  const { parent, pos, page, children } = find_block_index(id);
  const isTopLevel = parent.id === page.id;
  const isEmpty = !part1 && !part2;
  let new_block;

  if (!isTopLevel && isEmpty) { // outdent empty block
    outdent_block(id);
    update_block(old_block, CREATE_SPAN);
    new_block = old_block;
  } else if (!part1) { // at beginning of block
    new_block = create_block('', page.name);
    parent.children.splice(pos, 0, { id: new_block.id });
    new_block.page = page.name;
    update_block(old_block, CREATE_SPAN + part2);
  } else { // create new block
    new_block = create_block(CREATE_SPAN + part2, page.name);
    new_block.page = page.name;
    update_block(old_block, part1);
    if (children && children.length) { // as child
      parent.children[pos].children.unshift({ id: new_block.id });
    } else { // as sibling
      parent.children.splice(pos + 1, 0, { id: new_block.id });
    }
  }

  app.run('@save-file', page.name);
  return new_block.id;
}

export const merge_block = (id1: string, id2: string): string => {
  const blockIndex1 = find_block_index(id1);
  const blockIndex2 = find_block_index(id2);
  if (blockIndex2.children) {
    blockIndex1.children = blockIndex1.children || [];
    blockIndex1.children.push(...blockIndex2.children);
  }
  const block1 = find_block(id1);
  const block2 = find_block(id2);
  const html = remove_caret_span(block1.content) + CREATE_SPAN + remove_caret_span(block2.content);
  delete_block(id2);
  update_block(block1, html);
  return html;
}

const combine_block_id = page => {
  let list = page.children?.map(child => combine_block_id(child)) || [];
  return list.length ? page.id + '\n' + list.join('\n') : page.id;
}
export const find_prev = (id: string): string => {
  const page = find_page_index(id);
  const blocks = combine_block_id(page).split('\n');
  const pos = blocks.findIndex(b => b === id);
  return blocks[pos - 1];
}

export const find_next = (id: string): string => {
  const page = find_page_index(id);
  const blocks = combine_block_id(page).split('\n');
  const pos = blocks.findIndex(b => b === id);
  return blocks[pos + 1];
}

export const move_block_up = (id: string): boolean => {
  const source = find_block_index(id);
  if (isTopLevel(source as any) && isFirst(source as any)) return;
  const new_index = create_index(source as any);
  const prev = source.parent.children[source.pos - 1]?.id;
  if (prev) {
    const target = find_block_index(prev);
    if (!target) return;
    remove_from_parent(source);
    add_prev_sibling(target, new_index);
  } else {
    const parentIndex = find_block_index(source.parent.id);
    const target = prev_index(parentIndex);
    if (!target) return;
    remove_from_parent(source);
    append_child(target, new_index);
  }
  app.run('@save-file', source.page.name);
  return true;
}
export const move_block_down = (id: string): boolean => {
  const source = find_block_index(id);
  if (isTopLevel(source as any) && isLast(source as any)) return;
  const new_index = create_index(source as any);
  const next = source.parent.children[source.pos + 1]?.id;
  if (next) {
    const target = find_block_index(next);
    if (!target) return;
    add_next_sibling(target, new_index);
    remove_from_parent(source);
  } else {
    const parentIndex = find_block_index(source.parent.id);
    const target = next_index(parentIndex);
    if (!target) return;
    insert_child(target, new_index);
    remove_from_parent(source);
  }
  app.run('@save-file', source.page.name);
  return true;
}


export const move_block_to = (sourceId: string, targetId: string): boolean => {
  const source = find_block_index(sourceId);
  const target = find_block_index(targetId);
  if (!source || !target) return;
  const new_index = create_index(source as any);
  remove_from_parent(source);
  append_child(target, new_index);
  app.run('@save-file', target.page.name);
  return true;
}

//#endregion
