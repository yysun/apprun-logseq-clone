import { data, init_data, add_page, get_page_markdown } from '../model/index';

test('get page content 1', () => {
  const text = `- 1
  id:: _1
  prop:: value
- 2
  id:: _2`;

  init_data();
  add_page('test_page', text, new Date());
  const content = get_page_markdown('test_page');
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
  const content = get_page_markdown('test2');
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
  const content = get_page_markdown('test2');
  expect(content).toBe(text);
});