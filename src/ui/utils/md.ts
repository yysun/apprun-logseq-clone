import _md from 'markdown-it';
import turndown from 'turndown';

const md = _md({ html: true, breaks: true, linkify: true });
const wiki_link = /\#?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export const to_html = content => {
  content = md.render(content)
  content = content.replace(wiki_link, (match, p1) => `<a href="#page/pages/${p1}" data-is-page="true">${p1}</a>`);
  return content;
}

export const to_markdown = (html, keepCaret = true) => {
  const td = new turndown({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',

    blankReplacement(content, node) {
      if (keepCaret && node.tagName === 'SPAN' && node.id === '__caret') {
        return '<span id="__caret"></span> ';
      }
      return content;
    },
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

  const md = td.turndown(html);
  return md;
}