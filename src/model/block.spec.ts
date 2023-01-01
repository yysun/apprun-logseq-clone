import {
  data, init_data, add_page, find_block_page, find_block_parent,
  create_block, append_block, insert_block, find_block, move_block_after, delete_block
} from './page';

test('properties', () => {
  const text = `
- 1
  id::_1
  prop::value
- 2
  id::_2
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
  id::_1
  prop::value
- 2
  id::_2
  `;
  init_data();
  add_page('test', text, new Date());
  const page = find_block_page('_1');
  expect(page.name).toBe('test');
});

test('find block parent 1', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  `;
  init_data();
  add_page('test', text, new Date());
  const { parent, pos } = find_block_parent('_1');
  expect(parent.name).toBe('test');
  expect(pos).toBe(0);
});

test('find block parent 2', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test', text, new Date());

  const { parent, pos } = find_block_parent('_3');
  expect(parent.id).toBe('_1');
  expect(pos).toBe(1);
});


test('find block parent 2', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test2', text, new Date());
  const { parent, pos, page } = find_block_parent('_3');
  expect(parent.id).toBe('_1');
  expect(pos).toBe(1);
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
  id::_1
  prop with space::value with space
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

test('append block 1', () => {
  const text = `
- 1
  id::_1
  prop::value
`;
  init_data();
  add_page('test2', text, new Date());
  const block = create_block('');
  append_block(block, '_1');
  const { parent, pos, page } = find_block_parent('_1');
  expect(block.page).toBe('test2');
  expect(parent.children.length).toBe(2);
});

test('append block 2', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test2', text, new Date());
  const block = create_block('');
  append_block(block, '_3');
  const { parent, pos, page } = find_block_parent('_3');
  expect(block.page).toBe('test2');
  expect(parent.children.length).toBe(3);
});

test('insert block 1', () => {
  const text = `
- 1
  id::_1
  prop::value
`;
  init_data();
  add_page('test2', text, new Date());
  const block = create_block('');
  insert_block(block, '_1');
  const { parent, pos, page } = find_block_parent('_1');
  expect(block.page).toBe('test2');
  expect(parent.children.length).toBe(2);
  expect(parent.children[0].id).toBe(block.id);
  expect(parent.children[1].id).toBe('_1');
});

test('insert block 2', () => {
  const text = `
- 1
  id::_1
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test2', text, new Date());
  const block = create_block('');
  insert_block(block, '_3');
  const { parent, pos, page } = find_block_parent('_3');
  expect(block.page).toBe('test2');
  expect(parent.children.length).toBe(3);
  expect(parent.children[0].id).toBe('_2');
  expect(parent.children[1].id).toBe(block.id);
  expect(parent.children[2].id).toBe('_3');
});

test('delete block', () => {
  const text = `
- 1
  id::_1
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test2', text, new Date());
  const { parent, pos, page } = find_block_parent('_3');
  delete_block('_3');
  expect(parent.children.length).toBe(1);
  expect(parent.children[0].id).toBe('_2');
});

test('move block', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  `;
  init_data();
  add_page('test2', text, new Date());
  move_block_after('_3', '_1');
  const { parent, pos, page } = find_block_parent('_3');
  expect(parent.children.length).toBe(2);
  expect(parent.children[0].id).toBe('_1');
  expect(parent.children[1].id).toBe('_3');
});