import app from 'apprun';
import { to_html, to_markdown } from './md';

// let editing_div;

// export const open_editor = (div) => {
//   editing_div = div;
//   editing_div.setAttribute('contenteditable', 'true');
//   editing_div.focus();
// }

// export const close_editor = () => {
//   const text = editing_div.innerText;
//   editing_div.block.content = to_markdown(editing_div.innerHTML);
//   editing_div.innerHTML = to_html(text);
//   app.run('@save-block', editing_div.block);
//   editing_div.setAttribute('contenteditable', 'false');
// }

// export const open_editor = (div) => {
//   const textarea = document.createElement('textarea');
//   textarea.id = 'editor';
//   textarea.classList.add('editor');
//   textarea.value = div.block.content;
//   textarea.style.width = div.offsetWidth + 'px';
//   textarea.style.height = div.offsetHeight + 'px';
//   textarea.style.display = 'block';
//   setTimeout(() => textarea.focus(), 100);
//   editing_div = div;
//   editing_div.parentElement.appendChild(textarea);
//   editing_div.style.display = 'none';

// }

// export const close_editor = () => {
//   const textarea = document.getElementById('editor');
//   const text = textarea.value;
//   textarea.style.display = 'none';
//   editing_div.parentElement.removeChild(textarea);
//   editing_div.block.content = text;
//   editing_div.innerHTML = to_html(text);
//   editing_div.style.display = 'block';
//   app.run('@save-block', editing_div.block);
// }


const edit = (e) => {
  const element = e.target as HTMLElement;
  if (!element || !element.classList.contains('block-content')) return;
  const block = element['block'];
  // console.log(element['block']);
  if (e.key === 'Enter') {
    e.preventDefault();
    app.run('@add-block-sibling', block);
  } else if (e.key === 'Tab' && !e.ctrlKey) {
    e.preventDefault();
    app.run('@indent-block', block);
  } else if (e.key === 'Tab' && e.ctrlKey) {
    e.preventDefault();
    app.run('@outdent-block', block);
  }
};

export default () => {

  let saved_html;

  app.on('@edit-block-begin', e => {
    const { innerHTML } = e.target;
    saved_html = innerHTML;
    e.target.addEventListener('keydown', edit);
  });

  app.on('@edit-block-end', async e => {
    const { block, innerHTML } = e.target;
    if (innerHTML === saved_html) return;
    const md = to_markdown(innerHTML);
    block.content = md.replace(/ +/g, ' ');
    e.target.removeEventListener('keydown', edit);
    app.run('@save-block', block);
  });
}