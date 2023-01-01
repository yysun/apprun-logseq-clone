import app from 'apprun';
import { to_html, to_markdown } from '../model/md';
import { data, delete_block, find_block_index, indent_block, outdent_block, split_block } from '../model/page';
import { create_caret, split_content } from './caret';

const get_md = fragment => {
  const div = document.createElement('p');
  div.appendChild(fragment);
  return to_markdown(div.innerHTML);
}
export const focus_block = (id) => {
  setTimeout(() => {
    const new_element = document.getElementById(id).querySelector('.block-content');
    create_caret(new_element);
  });
}

const handle_enter_key = (e, element, id) => {
  e.preventDefault();
  const [c1, c2] = split_content(element),
    text1 = get_md(c1),
    text2 = get_md(c2);
  const new_block = split_block(id, text1, text2);
  focus_block(new_block.id);
  return data;
};

const handle_backspace_key = async (e, id, element) => {
  const md = to_markdown(element['innerHTML']);
  if (!md) {
    e.preventDefault();
    if (outdent_block(id)) {
      focus_block(id);
    } else {
      const { parent } = find_block_index(id);
      delete_block(id);
      focus_block(parent.children[parent.children.length - 1].id);
    }
    return data;
  }
}

const handle_tab_key = async (e, id) => {
  e.preventDefault();
  if (e.shiftKey) {
    outdent_block(id);
  } else {
    indent_block(id);
  }
  focus_block(id);
  return data;
}

export const editor_keydown = async (_, e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  const node = document.getSelection().anchorNode;
  const element = node.nodeType === 3 ?
    node.parentElement.closest('.block-content') : node;
  const id = (element as HTMLDivElement).closest('.block').id;

  if (key === 'Enter' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
    return handle_enter_key(e, element, id);
  } else if (key === 'Backspace') {
    return handle_backspace_key(e, id, element);
  } else if (key === 'Tab') {
    return handle_tab_key(e, id);
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