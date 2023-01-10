import { to_html, to_markdown } from '../ui/utils/md';

test('to_markdown with span', () => {
  const html = '<p>hello <span id="__caret">.</span> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello <span id="__caret">.</span> world');
});

test('to_markdown with wiki links', () => {
  const html = '<p>hello <a href="#page/abc">abc</a> world</p>';
  const md = to_markdown(html);
  expect(md).toBe('hello [[abc]] world');

});