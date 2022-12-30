import { get_blocks, get_page } from './page';

test('basic structure', () => {

  const text = `
1
  2
    3
    4
    5

  6
    7
8
  `;

  const blocks = get_blocks(text);
  expect(blocks.length).toBe(6);
  const page = get_page(blocks, 'test', 0);
  expect(blocks.length).toBe(7);
  expect(blocks[0].page).toBe('test');
  expect(blocks[6].page).toBe('test');
});