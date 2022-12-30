import _md from 'markdown-it';
import { readFileSync } from 'fs';
import { BlockList } from 'net';

let text = readFileSync('./src/model/2022_12_29.md', 'utf-8');

const lines = text.split('\n')
  .map((line) => {
    if (line[0] !== ' ' && line[0] !== '\t' && line[0] !== '-') line = '- ' + line;
    return line;
  })
text = lines.join('\n');


const md = _md({ html: true, breaks: true, linkify: true });
const nodes = md.parse(text, {});

// console.log(JSON.stringify(nodes, null, 2));

const stack = [];
let block = { type: 'root', children: [] };

nodes.forEach(node => {
  switch (node.type) {

    case 'list_item_open':
      const new_block = { type: 'list-item', children: [], content: node.content };
      stack.push(block);
      block.children.push(new_block);
      block = new_block;
      break;

    case 'list_item_close':
      if(block.children.length === 0) delete block.children;
      block = stack.pop();
      break;

    case 'fence':
      block.children.push({
        type: 'code',
        content: `${node.markup}${node.info}\n${node.content}\n${node.markup}`
      });
      // const code = `${ node.markup }${ node.info }\n${ node.content }\n${ node.markup }`
      // block.content += `${block.content}\n${code}`
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

console.log(JSON.stringify(block, null, 2));