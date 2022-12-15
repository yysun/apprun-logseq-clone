import _md from 'markdown-it';
import turndown from 'turndown';

const md = _md({ html: true, breaks: true, linkify: true });
const wiki_link = /\#?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export const to_html = content => {
  content = md.render(content);
  content = content.replace(wiki_link, (match, p1) => `<a href="#${p1}">${p1}</a>`);
  return content;
}

export const to_markdown = html => {
  const td = new turndown({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
  });
  return td.turndown(html);
}