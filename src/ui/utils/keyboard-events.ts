import { to_markdown } from './md';
import {
  find_block_index, indent_block, outdent_block, split_block, update_block, merge_block, find_prev, move_block_up, move_block_down
} from '../../model/index';
import { save_caret, split_element } from './caret';
import app from 'apprun';

const handle_enter_key = (e, id, element) => {
  e.preventDefault();
  const [c1, c2] = split_element(element);
  const text1 = to_markdown(c1), text2 = to_markdown(c2);
  split_block(id, text1, text2);
  return true;
};

const handle_backspace_key = (e, id, element) => {
  const [c1, c2] = split_element(element);
  const text1 = to_markdown(c1, false); //no span
  const index = find_block_index(id);
  if (text1 || !index) return;
  e.preventDefault();
  const { parent, pos, page } = index;
  const isTopLevel = parent.id === page.id;
  const isFirstChild = pos === 0;
  if (isTopLevel && isFirstChild) return;
  const prevBlockId = find_prev(id);
  merge_block(prevBlockId, id);
  return true;
}

const handle_tab_key = (e, id, element) => {
  e.preventDefault();
  save_caret(element);
  save(id, element);
  if (e.shiftKey) {
    outdent_block(id);
  } else {
    indent_block(id);
  }
  return true;
}

const handel_arrow_key = (e, id, element) => {
  let handled = false;
  const { key, altKey } = e;
  if (altKey && key.startsWith('Arrow')) {
    e.preventDefault();
    save_caret(element);
    save(id, element);
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
  }
  return handled;
}

const get_element = (): HTMLElement => {
  const node = document.getSelection().anchorNode;
  if (!node) return;
  const element = node.nodeType === 1 &&
    (node as HTMLElement)?.classList.contains('block-content') ? node :
    node.parentElement.closest('.block-content');
  return element as HTMLElement;
}

const save = (id, element) => {
  const md = to_markdown(element.innerHTML);
  update_block(id, md);
}

const refresh = (e) => {
  e.preventDefault();
  const source = e.target.closest('.editor');
  // let other editors refresh later
  setTimeout(() => app.run('//refresh', source), 10);
};

export const editor_keyup = (_, e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  if (metaKey || ctrlKey || shiftKey || altKey ||
    key === 'Tab' || key === 'Enter' || key === 'Escape' || key === 'Tab' ||
    key === 'Alt' || key === 'Control' || key === 'Meta' || key === 'Shift' ||
    key.startsWith('F') || key.startsWith('Arrow')) return;

  const element = get_element();
  if (!element) return;
  const id = (element as HTMLDivElement).id;
  save(id, element);
  refresh(e); // let other editors refresh, don't refresh this editor
}

export const editor_keydown = (state, e) => {
  const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
  const element = get_element()
  if (!element) return;
  const id = (element as HTMLDivElement).id;
  console.assert(id, 'Block id note found', element);
  let handled = false;
  if (altKey && key.startsWith('Arrow')) {
    handled = handel_arrow_key(e, id, element);
  } else if (key === 'Enter' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
    handled = handle_enter_key(e, id, element);
  } else if (key === 'Backspace') {
    handled = handle_backspace_key(e, id, element);
  } else if (key === 'Tab') {
    handled = handle_tab_key(e, id, element);
  }

  if (handled) {
    refresh(e); // let other editors refresh later
    return { ...state, source: null }; // let this editor refresh immediately
  }
}