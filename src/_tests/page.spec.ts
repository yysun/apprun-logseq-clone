import { data, init_data, parse_blocks, parse_page, add_page, get_page_content } from '../model/index';


test('basic structure 1', () => {
  const text = `
- 1
- 2
  `;
  const blocks = parse_blocks(text);
  expect(blocks.length).toBe(2);
  expect(blocks[0].content).toBe('1');
  expect(blocks[1].content).toBe('2');
});

test('basic structure 2', () => {
  const text = `
1
2
  `;
  const blocks = parse_blocks(text);
  expect(blocks.length).toBe(2);
  expect(blocks[0].content).toBe('1');
  expect(blocks[1].content).toBe('2');
});

test('basic structure 3', () => {
  const text = `
1
- 2
  `;
  const blocks = parse_blocks(text);
  expect(blocks.length).toBe(2);
  expect(blocks[0].content).toBe('1');
  expect(blocks[1].content).toBe('2');
});

test('basic structure 4', () => {
  const text = `
1
  - 2
  `;
  const blocks = parse_blocks(text);
  expect(blocks.length).toBe(1);
  expect(blocks[0].content).toBe('1');
  expect(blocks[0].children[0].content).toBe('2');
});

test('basic structure 5', () => {
  const text = `
- # 1
  - ## 1.1
  - ## 1.2
- # 2
  - ## 2.1
  - ## 2.2
  `;
  const blocks = parse_blocks(text);
  expect(blocks.length).toBe(2);
  expect(blocks[0].content).toBe('# 1');
  expect(blocks[0].children[0].content).toBe('## 1.1');
  expect(blocks[0].children[1].content).toBe('## 1.2');
  expect(blocks[1].content).toBe('# 2');
  expect(blocks[1].children[0].content).toBe('## 2.1');
  expect(blocks[1].children[1].content).toBe('## 2.2');
});

test('page 1', () => {
  const text = `
- 1
  id:: _1
- 2
  id:: _2
  `;
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page('test', blocks, new Date());

  expect(page_blocks.length).toBe(3);
  expect(page_blocks[0].id).toBe('_1');
  expect(page_blocks[0].content).toBe('1');
  expect(page_blocks[1].id).toBe('_2');
  expect(page_blocks[1].content).toBe('2');

  expect(page_blocks[2].id).not.toBeUndefined();
  expect(page_blocks[2].type).toBe('page');
  expect(page_blocks[2].page).toBe('test');
  expect(page_blocks[2].content).toBe('test');

  expect(page.children.length).toBe(2);
  expect(page.children[0].id).toBe('_1');
  expect(page.children[1].id).toBe('_2');
});

test('page 2', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
  `;
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page('test', blocks, new Date());
  expect(page_blocks.length).toBe(3);
  expect(page.children.length).toBe(1);
  expect(page.children[0].id).toBe('_1');
  expect(page.children[0].children[0].id).toBe('_2');
});

test('page 3', () => {
  const text = `
- 1
  id:: _1
  - 2
    id:: _2
-
3
  - 4
  `;
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page('test', blocks, new Date());
  expect(page_blocks.length).toBe(6);
  expect(page.children.length).toBe(3);
});

test('properties 1', () => {
  const text = `
- 1
  id:: _1
  prop:: value
- 2
  id:: _2
  `;
  const blocks = parse_blocks(text);
  const { page, page_blocks } = parse_page('test', blocks, new Date());
  expect(page_blocks.length).toBe(3);
  expect(page_blocks[0].id).toBe('_1');
  expect(page_blocks[0].prop).toBe('value');
  expect(page_blocks[1].id).toBe('_2');
});

test('get page content 1', () => {
  const text = `- 1
  id:: _1
  prop:: value
- 2
  id:: _2`;

  init_data();
  add_page('test_page', text, new Date());
  const content = get_page_content('test_page');
  expect(content).toBe(text);
});

test('get page content 1', () => {
  const text = `- 1
  id:: _1
  prop:: value
  - 2
    id:: _2`;
  init_data();
  add_page('test2', text, new Date());
  const content = get_page_content('test2');
  expect(content).toBe(text);
});

test('get page content 3', () => {
  const text = `- 1
  id:: _1
  prop:: value
  some text
  other text
  - 2
    id:: _2
    content of 2
- 3
  id:: _3
  content of 3`;
  init_data();
  add_page('test2', text, new Date());
  const content = get_page_content('test2');
  expect(content).toBe(text);
});