import _md from 'markdown-it';
import turndown from 'turndown';

const md = _md({ html: true, breaks: true, linkify: true });
const wiki_link = /\#?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export const to_html = content => {
  content = md.render(content)
  content = content.replace(wiki_link, (match, p1) => `<a href="#page/pages/${p1}" data-is-page="true">${p1}</a>`);
  return content;
}

export const to_markdown = (html, keepSpan=true) => {
  html = html.replace()
  const td = new turndown({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
  });
  td.addRule('wiki_link', {
    filter: 'a',
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      if (href.startsWith('#page/')) {
        return `[[${href.slice(6)}]]`;
      }
      return content;
    }
  });
  keepSpan && td.keep(['span']);
  const md = td.turndown(html);
  return md;
}