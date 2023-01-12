import { to_html, to_markdown } from './md';

test('to_html with wiki link', () => {
  const md = 'hello [[abc]] world';
  const html = to_html(md);
  console.log(html);
  expect(html).toBe('<p>hello <a href="#page/pages/abc" data-is-page="true">abc</a> world</p>\n');
});

// the following tests are not working means to_markdown(text, false) is not working as needed

// test('to_markdown with span', () => {
//   const html = '<p>hello <span id="__caret"> </span> world</p>';
//   const md = to_markdown(html);
//   expect(md).toBe('hello <span id="__caret"> </span> world');
// });

// test('to_markdown without span', () => {
//   const html = '<p>hello <span id="__caret">.</span> world</p>';
//   const md = to_markdown(html, false);
//   expect(md).toBe('hello world');
// });

test('to_markdown with wiki links', () => {
  const html = '<p>hello <a href="#page/abc">abc</a> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello [[abc]] world');

});

// not sure how to handle the encoding yet

// test('to_markdown with date', () => {
//   const html = '<p>2022_12_07</p>';
//   const md = to_markdown(html);
//   expect(md).toBe('2022_12_07');
// });
