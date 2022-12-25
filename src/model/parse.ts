// @ts-check
import { join, parse } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import crypto from 'crypto';
// const sha1 = str => crypto.createHash('sha1').update(str).digest('hex');
const get_id = () => crypto.randomUUID();

const all_blocks = [];
const pages = [];

let keywords = [];
const keyword_count = {};
const index = {};
const index_file = '../pages/index.md';

if (existsSync(index_file)) {
  keywords = readFileSync(index_file).toString()
    .match(/\[\[.*?\]\]/g)
    .map(line => line.replace(/[\-?#*\[\]]/g, '').trim())
    .sort((a, b) => a.length - b.length)
    .filter(line => line.length > 0);
}

keywords = [...new Set(keywords)];
if (keywords.length === 0) {
  console.log('No index file or keywords found');
  // return;
}

const makeLink = key => `#[[${key}]]`;
// const makeLink = key => `[[${key}]]`;

const skip = file => file.indexOf('.md') < 0 || file.indexOf('index.md') >= 0;

export function process_directory(dir) {
  walkDir(dir, file => process_file(file));
  function walkDir(dir, callback) {
    readdirSync(dir).forEach(f => {
      let dirPath = join(dir, f);
      let isDirectory = statSync(dirPath).isDirectory();
      if (skip(f)) return;
      isDirectory ? walkDir(dirPath, callback) : callback(join(dir, f));
    });
  }
}

export function process_file(file, save = false) {

  const text = readFileSync(file).toString();
  const blocks = get_blocks(text);

  const page = get_page(blocks, parse(file).name);

  // search for keywords
  blocks.forEach(b => {
    const { content, keys } = find_keywords(b.content);
    if (keys.length) {
      b.content = content;

      index[file] = index[file] || [];
      index[file].push({
        line: b.line,
        keys: keys.join(', '),
      });

      for (const key of keys) {
        keyword_count[key] = keyword_count[key] || [];
        keyword_count[key].push({ file, line: b.line });
      }
    }
  });

  if (save) {
    const new_text = blocks.map(b => b.content).join('\n');
    writeFileSync(file, new_text);
  }

  all_blocks.push(...blocks.map(b => {
    delete b.text;
    return b;
  }));

  pages.push(page);

}


export function get_page(page_blocks, name) {
  const blocks = page_blocks.map(b => {
    b.page = name;
    return { id: b.id, level: b.level }
  });

  const page = {
    children: [blocks[0]],
    id: get_id()
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


export function find_keywords(content) {
  const last = content.lastIndexOf('//');
  if (last > 0) content = content.substring(0, last).trimEnd();

  const all_keys = keywords.filter(key => content.includes(key))
  // const keys = all_keys
  //   .filter(key => !content.includes(`[[${key}`))
  //   .map(key => makeLink(key));

  // if (keys.length > 0) {
  //   content += ` // ${keys.join(' ')}`;
  // }

  return { content, keys: all_keys };
}

export { all_blocks as blocks, pages, keyword_count as keywords, index };