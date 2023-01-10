import _md from 'markdown-it';
import { v4 as uuidv4 } from 'uuid';
const get_id = () => uuidv4();

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

  const page_name = name.substring(name.lastIndexOf('/') + 1);
  page_blocks.push({ id: page.id, page: name, content: page_name, type: 'page' });
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

