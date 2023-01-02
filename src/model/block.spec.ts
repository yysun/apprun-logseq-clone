import {
  data, init_data, add_page, find_block_page, find_block_index,
  create_block, find_block, delete_block,
  indent_block, outdent_block, split_block
} from './index';

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
  const name = find_block_page('_1');
  expect(name).toBe('test');
});

test('find block index 1', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
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
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
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
  id::_1
  prop::value
  - 2
    id::_2
    - 3
      id::_3
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
  const { parent, pos, page } = find_block_index('_3');
  delete_block('_3');
  expect(parent.children.length).toBe(1);
  expect(parent.children[0].id).toBe('_2');
});

test('indent block - first item cannot indent', () => {
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
  indent_block('_2');
  const { parent, pos, page } = find_block_index('_1');
  expect(parent.id).toBe(page.id);
});

test('indent block - second item can indent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  - 4
    id::_4
  `;
  init_data();
  add_page('test', text, new Date());
  indent_block('_3');
  const { parent, pos, page } = find_block_index('_3');
  expect(parent.id).toBe('_2');
});

test('indent block - last item can indent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
    - 4
      id::_4
  `;
  init_data();
  add_page('test', text, new Date());
  indent_block('_3');
  const { parent, pos, page, children } = find_block_index('_3');
  expect(parent.id).toBe('_2');
  expect(children.length).toBe(1);
});


test('outdent block - first top item cannot outdent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  - 4
    id::_4
  `;
  init_data();
  add_page('test', text, new Date());
  outdent_block('_1');
  const { parent, pos, page } = find_block_index('_1');
  expect(parent.id).toBe(page.id);
});

test('outdent block - second item can outdent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
    - 3
      id::_3
  - 4
    id::_4
  `;
  init_data();
  add_page('test', text, new Date());
  outdent_block('_2');
  const { parent, pos, page, children } = find_block_index('_2');
  expect(parent.id).toBe(page.id);
  expect(children.length).toBe(1);
});

test('outdent block - last item cannot outdent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
    - 4
      id::_4
  `;
  init_data();
  add_page('test', text, new Date());
  outdent_block('_4');
  const { parent, pos, page } = find_block_index('_4');
  expect(parent.id).toBe('_1');

});

test('outdent - indent', () => {
  const text = `
- 1
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  - 4
    id::_4
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
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
  - 4
    id::_4
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
  id::_1
  prop::value
  - 2
    id::_2
  - 3
    id::_3
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
  id::_1
  prop::value
  - 2
    id::_2
    - 3
      id::_3
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
  expect(find_block(children[0].id).content).toBe('456');
  expect(find_block(children[0].id).page).toBe('p1');
});

test('split block - in middle - no children', () => {
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
  add_page('p2', text, new Date());
  split_block('_2', 'test', '');
  const { parent, pos, page } = find_block_index('_2');
  expect(parent.children.length).toBe(3);
  expect(parent.children[0].id).toBe('_2');
  expect(parent.children[1].id).not.toBe('_2');
  expect(find_block('_2').content).toBe('test');
  expect(find_block(parent.children[1].id).content).toBe('');
  expect(find_block(parent.children[1].id).page).toBe('p2');
});