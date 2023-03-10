import app from 'apprun';
import {
  data, init_data, add_page, find_page_name, find_block_index,
  create_block, find_block, delete_block,
  indent_block, outdent_block, split_block, merge_block, move_block_up, move_block_down, move_block_to,
  find_prev, find_next
} from '../model/index';

app.on('@save-file', () => { });

test('properties', () => {
  const text = `
- 1
  id:: _1
  prop:: value
- 2
  id:: _2
  `;
  init_data();
  add_page('test', text, new Date());
  expect(data.blocks.length).toBe(3);
  expect(data.blocks[0].id).toBe('_1');
  expect(data.blocks[0].prop).toBe('value');
  expect(data.blocks[1].id).toBe('_2');
});

test('find block page', () => {
  const text = `
- 1
  id:: _1
  prop:: value
- 2
  id:: _2
  `;
  init_data();
  add_page('test', text, new Date());
  const name = find_page_name('_1');
  expect(name).toBe('test');
});

test('find block index 1', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  `;
  init_data();
  add_page('test', text, new Date());
  const { parent, pos, page } = find_block_index('_1');
  expect(parent.children[0].id).toBe('_1');
  expect(page.name).toBe('test');
  expect(pos).toBe(0);
});

test('find block index 2', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  `;
  init_data();
  add_page('test', text, new Date());

  const { parent, pos } = find_block_index('_3');
  expect(parent.id).toBe('_1');
  expect(pos).toBe(1);
});


test('find block index 2', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
    - 3
      id:: _3
  `;
  init_data();
  add_page('test2', text, new Date());
  const { parent, pos, page } = find_block_index('_3');
  expect(parent.id).toBe('_2');
  expect(pos).toBe(0);
  expect(page.name).toBe('test2');
});


test('create block 1', () => {
  const text = ``;
  init_data();
  const block = create_block(text);
  expect(block.id).not.toBeUndefined();
  expect(block.content).toBe('');
  expect(data.blocks.length).toBe(1);
});

test('create block 2', () => {
  const text = `
1
  id:: _1
  prop with space:: value with space
  text
  `;
  init_data();
  const block = create_block(text);
  expect(block.id).toBe('_1');
  expect(block['prop with space']).toBe('value with space');
  expect(block.content).toBe('1\ntext');
  const b = find_block('_1');
  expect(b).toBe(block);
});

test('delete block', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
  - 3
    id:: _3
  `;
  init_data();
  add_page('test2', text, new Date());
  const { parent, pos, page } = find_block_index('_3');
  delete_block('_3');
  expect(parent.children.length).toBe(1);
  expect(parent.children[0].id).toBe('_2');
});

test('indent block - first item cannot indent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  `;
  init_data();
  add_page('test', text, new Date());
  const b = indent_block('_2');
  expect(b).toBeUndefined();
  const { parent, pos, page } = find_block_index('_1');
  expect(parent.id).toBe(page.id);
});

test('indent block - second item can indent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  - 4
    id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  const b = indent_block('_3');
  expect(b).toBe(true);
  const { parent, pos, page } = find_block_index('_3');
  expect(parent.id).toBe('_2');
});

test('indent block - last item can indent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
    - 4
      id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  const b = indent_block('_3');
  expect(b).toBe(true);
  const { parent, pos, page, children } = find_block_index('_3');
  expect(parent.id).toBe('_2');
  expect(children.length).toBe(1);
});


test('outdent block - first top item cannot outdent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  - 4
    id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  const b = outdent_block('_1');
  expect(b).toBeUndefined();
  const { parent, pos, page } = find_block_index('_1');
  expect(parent.id).toBe(page.id);
});

test('outdent block - with children', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
    - 3
      id:: _3
  - 4
    id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  const b = outdent_block('_2');
  expect(b).toBe(true);
  const { parent, pos, page, children } = find_block_index('_2');
  expect(parent.id).toBe(page.id);
  expect(children.length).toBe(2);
});

test('outdent block - with children 2', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
    - 5
      id:: _5
  `;
  init_data();
  add_page('test', text, new Date());
  const b = outdent_block('_3');
  expect(b).toBe(true);
  const { parent, pos, page, children } = find_block_index('_3');
  expect(parent.id).toBe('_1');
  expect(children.length).toBe(2);
});


test('outdent block - last item can outdent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
    - 4
      id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  const b = outdent_block('_4');
  expect(b).toBe(true);
  const { parent, pos, page } = find_block_index('_4');
  expect(parent.id).toBe('_1');

});

test('outdent - indent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  - 4
    id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  outdent_block('_4');
  indent_block('_4');
  const { parent, pos, page } = find_block_index('_4');
  expect(parent.id).toBe('_1');
});

test('indent - outdent', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  - 4
    id:: _4
  `;
  init_data();
  add_page('test', text, new Date());
  indent_block('_4');
  outdent_block('_4');
  const { parent, pos, page } = find_block_index('_4');
  expect(parent.id).toBe('_1');
});


test('split block - at start', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  `;
  init_data();
  add_page('p0', text, new Date());
  split_block('_2', '', 'test');
  const { parent, pos, page } = find_block_index('_2');
  expect(parent.children.length).toBe(3);
  expect(parent.children[0].id).not.toBe('_2');
  expect(parent.children[1].id).toBe('_2');
  expect(find_block(parent.children[1].id).content).toBe('test');
  expect(find_block(parent.children[1].id).page).toBe('p0');
});

test('split block - in middle - has children', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
    - 3
      id:: _3
  `;
  init_data();
  add_page('p1', text, new Date());
  split_block('_2', '123', '456');
  const { parent, pos, page, children } = find_block_index('_2');
  expect(parent.children.length).toBe(1);
  expect(children.length).toBe(2);
  expect(children[0].id).not.toBe('_3');
  expect(children[1].id).toBe('_3');
  expect(find_block('_2').content).toBe('123');
  expect(find_block(children[0].id).content).toBe('<span id=\"__caret\">.</span>456');
  expect(find_block(children[0].id).page).toBe('p1');
});

test('split block - in middle - no children', () => {
  const text = `
- 1
  id:: _1
  prop:: value
  - 2
    id:: _2
  - 3
    id:: _3
  `;
  init_data();
  add_page('p2', text, new Date());
  split_block('_2', 'test', '');
  const { parent, pos, page } = find_block_index('_2');
  expect(parent.children.length).toBe(3);
  expect(parent.children[0].id).toBe('_2');
  expect(parent.children[1].id).not.toBe('_2');
  expect(find_block('_2').content).toBe('test');
  expect(find_block(parent.children[1].id).content).toBe('<span id=\"__caret\">.</span>');
  expect(find_block(parent.children[1].id).page).toBe('p2');
});


test('merge block without children - same level', () => {
  const text = `
- 1
  id:: _1
- 2
  id:: _2
  `;
  init_data();
  add_page('p2', text, new Date());
  merge_block('_1', '_2');
  expect(find_block_index('_2')).toBeNull();
  const block = find_block('_1');
  expect(block.content).toBe('1<span id=\"__caret\">.</span>2');
});

test('merge block without children - from child', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
  `;
  init_data();
  add_page('p2', text, new Date());
  merge_block('_1', '_2');
  expect(find_block_index('_2')).toBeNull();
  const block = find_block('_1');
  expect(block.content).toBe('1<span id=\"__caret\">.</span>2');
});

test('merge block with children 1', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
      - 5
        id:: _5
  `;
  init_data();
  add_page('p2', text, new Date());
  merge_block('_1', '_2');
  expect(find_block_index('_2')).toBeNull();
  const { children } = find_block_index('_1');
  expect(children.length).toBe(2);
});

test('merge block with children 2', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
      - 5
        id:: _5
  `;
  init_data();
  add_page('p2', text, new Date());
  merge_block('_3', '_4');
  expect(find_block_index('_4')).toBeNull();
  const blockIndex = find_block_index('_3');
  expect(blockIndex.children.length).toBe(1);
});

test('find next block', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(find_next('_1')).toBe('_2');
  expect(find_next('_2')).toBe('_3');
  expect(find_next('_3')).toBe('_4');
  expect(find_next('_4')).toBe('_5');
  expect(find_next('_5')).toBeUndefined();
});

test('find prev block', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(find_prev('_1')).not.toBeNull();
  expect(find_prev('_2')).toBe('_1');
  expect(find_prev('_3')).toBe('_2');
  expect(find_prev('_4')).toBe('_3');
  expect(find_prev('_5')).toBe('_4');
});

test('move block up - same parent', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(move_block_up('_1')).toBeUndefined();
  move_block_up('_4');
  const { parent } = find_block_index('_4');
  expect(parent.id).toBe('_2');
});

test('move block down - same parent', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(move_block_down('_5')).toBeUndefined();
  move_block_down('_3');
  const { parent } = find_block_index('_3');
  expect(parent.id).toBe('_2');
});

test('move block up - beyond parent', () => {
  const text = `
- 0
  - 1
    id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(move_block_up('_1')).toBeUndefined();
  move_block_up('_3');
  const { parent } = find_block_index('_3');
  expect(parent.id).toBe('_1');
});

test('move block down - beyond parent', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
    - 3
      id:: _3
    - 4
      id:: _4
  - 5
    id:: _5
  `;
  init_data();
  add_page('pp', text, new Date());
  expect(move_block_down('_5')).toBeUndefined();
  move_block_down('_4');
  const { parent } = find_block_index('_4');
  expect(parent.id).toBe('_5');
});