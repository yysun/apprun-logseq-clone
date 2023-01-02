import { to_markdown } from '../model/md';
import {
  data, find_block_index, indent_block, outdent_block, split_block, update_block, merge_block
} from '../model/index';
import { create_caret, restore_caret, save_caret, split_element } from './caret';

export const new_block_caret = (id, toStart) => {
  setTimeout(() => {
    const new_element = document.getElementById(id);
    create_caret(new_element, toStart);
  });
}

export const restore_block_caret = (id, caret_html = null) => {
  setTimeout(() => {
    const new_element = document.getElementById(id);
    restore_caret(new_element, caret_html);
  });
}

const handle_enter_key = (e, id, element) => {
  e.preventDefault();
  const [c1, c2] = split_element(element);
  const text1 = to_markdown(c1), text2 = to_markdown(c2);
  const { parent, page } = find_block_index(id);
  const isTopLevel = parent.id === page.id;
  const isEmpty = !text1 && !text2;
  if (!isTopLevel && isEmpty) {
    outdent_block(id);
    new_block_caret(id, true);
  } else {
    const new_block = split_block(id, text1, text2);
    new_block_caret(new_block.id, true);
  }
  return data;
};

const handle_backspace_key = (e, id, element) => {
  const [c1, c2] = split_element(element);
  const text1 = to_markdown(c1), text2 = to_markdown(c2);
  const index = find_block_index(id);
  if (text1 || !index) return;
  e.preventDefault();
  const { parent, pos, page } = index;
  const isTopLevel = parent.id === page.id;
  const isFirstChild = pos === 0;
  if (isTopLevel && isFirstChild) return;
  const prevBlockId = parent.children[pos - 1]?.id || parent.id;
  merge_block(prevBlockId, id);
  restore_block_caret(prevBlockId);
  return data;
}

const handle_tab_key = async (e, id, element) => {
  e.preventDefault();
  const html = save_caret(element);
  if (e.shiftKey) {
    outdent_block(id);
  } else {
    indent_block(id);
  }
  restore_block_caret(id, html);
  return data;
}

export const editor_keydown = (_, e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  const node = document.getSelection().anchorNode;
  const element = node.nodeType === 1 &&
    (node as HTMLElement).classList.contains('block-content') ? node :
    node.parentElement.closest('.block-content');
  const id = (element as HTMLDivElement).id;
  console.assert(id, 'Block id note found', element);
  if (key === 'Enter' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
    return handle_enter_key(e, id, element);
  } else if (key === 'Backspace') {
    if (handle_backspace_key(e, id, element)) return data;
  } else if (key === 'Tab') {
    return handle_tab_key(e, id, element);
  }
  if (id) {
    const md = to_markdown((element as HTMLElement).innerHTML);
    update_block(id, md);
  }
}