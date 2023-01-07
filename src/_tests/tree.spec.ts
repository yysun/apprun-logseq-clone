import { data, init_data, add_page, find_block_path } from '../model/index';
import { create_tree, filter, reduce, map } from './tree'

test('get page content 3', () => {
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

  // const tree = create_tree(data.pages[0]);
  // const filtered = filter(([id]) => id === '_2', tree);
  // const mapped = map(([id]) => ({ id }), filtered);
  // // console.log(JSON.stringify(mapped, null, 2));
  // const reduced = reduce((acc, [id]) => {
  //   acc.push(id)
  //   return acc;
  // }, filtered, []);
  // // console.log(JSON.stringify(reduced, null, 2));

  const path = find_block_path('_2');
  console.log(JSON.stringify(path, null, 2));
  expect(path.length).toBe(3);
  expect(path[2]).toBe('_2');

});