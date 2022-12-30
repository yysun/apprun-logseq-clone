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
  expect(blocks[0].content).toBe('1');
  expect(blocks[2].level).toBe(4);
  expect(blocks[3].level).toBe(2);
  expect(blocks[3].line).toBe(8);
  expect(blocks[3].text).toBe('  6');
  expect(blocks[3].content).toBe('6');
});


test('properties', () => {

  const text = `
1
id::1
  2
  id::2
    3
id::3
    4
    id::4
    open::false
    5

  6
  prop with spaces::value with spaces
    7
8
lang::en
  `;

  const blocks = get_blocks(text);
  // const page = get_page(blocks);
  // console.log(blocks, page);

  expect(blocks[0].id).toBe('1');
  expect(blocks[1].id).toBe('2');
  expect(blocks[2].id).not.toBeUndefined();
  expect(blocks[3].id).toBe('3'); // added an empty-content block
  expect(blocks[4].id).toBe('4');
  expect(blocks[4].open).toBe('false');
  expect(blocks[5]['prop with spaces']).toBe('value with spaces');
  expect(blocks[6].id).not.toBeUndefined();
  expect(blocks[7].lang).toBe('en');
});