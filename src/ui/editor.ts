import app from 'apprun';
import { to_html, to_markdown } from '../model/md';
import { data, delete_block, find_block_parent, move_block_after } from '../model/page';
import { create_caret, split_content } from './caret';
import { update_block, create_block, append_block } from '../model/page';

const get_md = fragment => {
  const div = document.createElement('p');
  div.appendChild(fragment);
  return to_markdown(div.innerHTML);
}

const handle_enter_key = (e, md, block, element) => {
  e.preventDefault();
  update_block(block, md);
  let [c1, c2] = split_content(element);
  c2 = get_md(c2);
  const new_block = create_block(c2);
  append_block(new_block, block);
  if (c2) {
    c1 = get_md(c1);
    update_block(block, c1);
  }
  setTimeout(() => {
    const new_element = document.getElementById(new_block.id).querySelector('.block-content');
    create_caret(new_element);
  });
  return data;
};

const handle_backspace_key = async (e, md, block, element) => {
  if (!md) {
    e.preventDefault();
    const { parent } = find_block_parent(block);
    if (parent.name) {
      delete_block(block);
      setTimeout(() => {
        const prev_id = parent.children[parent.children.length - 1].id;
        const prev_elements = Array.from(document.getElementById(prev_id).querySelectorAll('.block-content'));
        const new_element = prev_elements[prev_elements.length - 1]; 
        create_caret(new_element);
      });
    } else {
      move_block_after(block, parent);

      setTimeout(() => {
        const new_element = document.getElementById(block.id).querySelector('.block-content');
        create_caret(new_element);
      });
    }
    return data;
  }
}

const handle_tab_key = async (e, block) => {


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
    return editing && handle_enter_key(e, md, block, element);
  } else if (key === 'Backspace') {
    return editing && handle_backspace_key(e, md, block, element);
  } else if (key === 'Tab') {
    editing && handle_tab_key(e, block);
    console.log(range);
    console.log(window.getSelection().getRangeAt(0));
    const sel = window.getSelection();
    sel.addRange(range);
    return data;
    // } else {
    //   const md = to_markdown(element['innerHTML']);
    //   update_block(block, to_markdown(md));
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