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

export const get_page_file = (block) => {
  const page = find_page(block);
  if (!page) return {}
  const content = create_content(page);
  return {
    file_name: `${block.page}.md`,
    content
  }
}

export function get_page(page_blocks, name, lastModified) {
  const id = get_id();
  const blocks = page_blocks.map(b => {
    b.page = name;
    b.page_id = id;
    return { id: b.id, level: b.level }
  });

  const page = {
    id,
    name,
    children: [blocks[0]],
    lastModified
  };

  const parents = {};

  blocks.reduce((prev, curr) => {
    let parent = prev;
    if (curr.level <= prev.level) {
      parent = parents[curr.level];
      if (!parent) {
        parent = parents[curr.level] = page;
      }
    }
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(curr);
    parents[curr.level] = parent;
    return curr;
  });

  page_blocks.push({ id: page.id, page: name, content: name, type: 'page' });
  return page;
}

export function get_blocks(text) {
  const lines = text.split('\n').map((l, idx) => ({
    content: l,
    level: l.indexOf(l.trimStart()),
    line: idx + 1,
  })).filter(l => l.content.trim().length > 0);

  const blocks = [];

  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    if (!line.content.trimStart().startsWith('- ') && last && line.level === last.level) {
      last.content += '\n' + line.content;
    } else {
      blocks.push(line);
    }
  }

  // remove leading spaces after save
  blocks.forEach(b => {
    b.text = b.content;
    b.content = b.content.trimStart();
    get_properties(b);
  });

  return blocks;
}

export function get_properties(block) {
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
  if (!block.id) {
    block.id = get_id();
  }
}

export function add_page(name, text, lastModified) {
  const blocks = get_blocks(text);
  const page = get_page(blocks, name, lastModified);
  data.blocks.push(...blocks.map(b => {
    delete b.text;
    return b;
  }));
  data.pages.push(page);
}
