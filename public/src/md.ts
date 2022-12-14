import _md from 'markdown-it';

const md = _md({ html: true, breaks: true, linkify: true });
const wiki_link = /\#?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export default content => {
  content = md.render(content);
  content = content.replace(wiki_link, (match, p1) => `<a href="#${p1}">${p1}</a>`);
  return content;
}