import { to_html, to_markdown } from './md';

test('to_html with wiki link', () => {
  const md = 'hello [[abc]] world';
  const html = to_html(md);
  expect(html).toBe('<p>hello <a href="/page/pages/abc" data-is-page="true">abc</a> world</p>\n');
});

test('to_markdown with caret span', () => {
  const html = '<p>hello <span id="__caret"></span> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello <span id="__caret"></span> world');
});

test('to_markdown with caret span 2', () => {
  const html = '<p>hello <span id="__caret"></span> <span style="color:red">world</span></p>';
  const md = to_markdown(html);
  expect(md).toBe('hello <span id="__caret"></span> world');
});

test('to_markdown without caret span', () => {
  const html = '<p>hello <span id="__xcaret"></span> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello world');
});

test('to_markdown without caret span 2', () => {
  const html = '<p>hello <span id="__xcaret"></span> <span style="color:red">world</span></p>';
  const md = to_markdown(html);
  expect(md).toBe('hello world');
});

test('to_markdown with wiki links', () => {
  const html = '<p>hello <a href="/page/abc" data-is-page="true">abc</a> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello [[abc]] world');

});

// not sure how to handle the encoding yet

// test('to_markdown with date', () => {
//   const html = '<p>2022_12_07</p>';
//   const md = to_markdown(html);
//   expect(md).toBe('2022_12_07');
// });


// test('handle code block', () => {
//   const html ='<p>```<br>code block test<br>```</p>';
//   const md = to_markdown(html);
//   expect(md).toBe('```\ncode block test\n```');
// });