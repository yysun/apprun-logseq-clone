import app from 'apprun';
import { to_html, to_markdown } from '../model/md';
import { data, refresh_page } from '../model/page';
import { create_caret } from './caret';

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

const handle_enter_key = async (e, md, block, element) => {
  block.content = md.replace(/ +/g, ' ');
  const content = ' '.repeat(block.level) + '- ';
  block.content = block.content + '\n' + content;
  if (!block.content.startsWith('-')) {
    block.content = ' '.repeat(block.level) + '- ' + block.content;
  }
  refresh_page(block.page);
  create_caret(element);
};

const handle_backspace_key = async (e, md, block) => {
  block.content = md.replace(/ +/g, ' ');
  if (!block.content) {
    refresh_page(block.page);
  }
}

const handle_tab_key = async (e, md, block) => {
  let level = block.level;
  if (e.shiftKey) {
    level = level - 1;
    if (level < 0) level = 0;
  } else {
    level = level + 1;
  }
  block.level = level;
  refresh_page(block.page);
}

export const editor_keydown = async (_, e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  const range = window.getSelection().getRangeAt(0);
  const node = document.getSelection().anchorNode;
  const element = node.nodeType === 3 ?
    node.parentElement.closest('.block-content') : node;
  const editing = (element && element['block']);
  const block = element['block'];
  const md = to_markdown(element['innerHTML']);

  if (key === 'Enter' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
    e.preventDefault();
    editing && handle_enter_key(e, md, block, element);
    return data;
  } else if (key === 'Backspace') {
    e.preventDefault();
    editing && handle_backspace_key(e, md, block);
    return data;
  } else if (key === 'Tab') {
    e.preventDefault();
    editing && handle_tab_key(e, md, block);
    console.log(range);
    console.log(window.getSelection().getRangeAt(0));
    const sel = window.getSelection();
    sel.addRange(range);
    return data;
  }
}

export default () => {

  let saved_html

  app.on('@edit-block-begin', e => {
    const { block, innerHTML } = e.target;
    saved_html = innerHTML;
    // e.target.addEventListener('keydown', editor_keydown);
  });

  app.on('@edit-block-end', async e => {
    // const { block, innerHTML } = e.target;
    // if (innerHTML === saved_html) return;
    // const md = to_markdown(innerHTML);
    // block.content = md.replace(/ +/g, ' ');
    // // e.target.removeEventListener('keydown', editor_keydown);
    // await save_file(block.page);
  });

}