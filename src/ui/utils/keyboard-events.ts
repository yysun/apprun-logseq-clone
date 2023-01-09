import { to_markdown } from './md';
import {
  data, find_block_index, indent_block, outdent_block, split_block, update_block, merge_block, find_prev, move_block_up, move_block_down

} from '../../model/index';
import { create_caret, restore_caret, save_caret, split_element } from './caret';
import app from 'apprun';


const new_block_caret = (id, toStart) => {
  setTimeout(() => {
  const element = document.getElementById(id);
    element && create_caret(element, toStart);
  }, 10);
}

const restore_block_caret = (id, caret_html = null) => {
  setTimeout(() => {
    const element = document.getElementById(id);
    restore_caret(element, caret_html);
  }, 10);
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
  };
  return true;
};

const handle_backspace_key = (e, id, element) => {
  const [c1, c2] = split_element(element);
  const text1 = to_markdown(c1);
  const index = find_block_index(id);
  if (text1 || !index) return;
  e.preventDefault();
  const { parent, pos, page } = index;
  const isTopLevel = parent.id === page.id;
  const isFirstChild = pos === 0;
  if (isTopLevel && isFirstChild) return;
  const prevBlockId = find_prev(id);
  const html = merge_block(prevBlockId, id);
  restore_block_caret(prevBlockId, html);
  return true;
}

const handle_tab_key = (e, id, element) => {
  e.preventDefault();
  const html = save_caret(element);
  if (e.shiftKey) {
    outdent_block(id);
  } else {
    indent_block(id);
  }
  restore_block_caret(id, html);
  return true;
}

const get_element = (): HTMLElement => {
  const node = document.getSelection().anchorNode;
  if (!node) return;
  const element = node.nodeType === 1 &&
    (node as HTMLElement)?.classList.contains('block-content') ? node :
    node.parentElement.closest('.block-content');
  return element as HTMLElement;
}

export const editor_keyup = (e) => {

  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  if (metaKey || ctrlKey || shiftKey || altKey ||
    key === 'Tab' || key === 'Enter' || key === 'Escape' ||
    key === 'Alt' || key === 'Control' || key === 'Meta' || key === 'Shift' ||
    key.startsWith('F') || key.startsWith('Arrow')) return;

  const element = get_element();
  if (!element) return;
  e.preventDefault();
  const id = element.id;
  const md = to_markdown(element.innerHTML);
  update_block(id, md);
}

export const editor_keydown = (e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  const element = get_element();
  if (!element) return;
  const id = element.id;
  console.assert(id, 'Block id note found', element);

  let handled = false;
  if (altKey && key.startsWith('Arrow')) {
    e.preventDefault();
    const html = save_caret(element);
    switch (key) {
      case 'ArrowUp':
        handled = move_block_up(id);
        break;
      case 'ArrowDown':
        handled = move_block_down(id);
        break;
      case 'ArrowLeft':
        handled = outdent_block(id);
        break;
      case 'ArrowRight':
        handled = indent_block(id);
        break;
    }
    if (handled) {
      restore_block_caret(id, html);
    }
  }

  if (key === 'Enter' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
    handled = handle_enter_key(e, id, element);
  } else if (key === 'Backspace') {
    handled = handle_backspace_key(e, id, element);
  } else if (key === 'Tab') {
    handled = handle_tab_key(e, id, element);
  }

  if (handled) {
    e.preventDefault();
    app.run('@refresh')
  }
}