import app from 'apprun';
import { to_html, to_markdown } from './md';

let editing_div;

export const open_editor = (div) => {
  editing_div = div;
  editing_div.setAttribute('contenteditable', 'true');
  editing_div.focus();
}

export const close_editor = () => {
  const text = editing_div.innerText;
  editing_div.block.content = to_markdown(editing_div.innerHTML);
  editing_div.innerHTML = to_html(text);
  app.run('@save-block', editing_div.block);
  editing_div.setAttribute('contenteditable', 'false');
}

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