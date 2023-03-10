const get_range = () => {
  const selection = window.getSelection();
  return selection && selection.rangeCount ? selection.getRangeAt(0) : null;
}

export const save_caret = (element) => {
  const range = get_range();
  if (!range) return;
  let anchor = element.querySelector('#__caret');
  if (anchor) anchor.remove();
  anchor = document.createElement('span');
  anchor.id = '__caret';
  range.insertNode(anchor);
  return element.innerHTML
}

export const restore_caret = (element): HTMLElement => {
  const selection = window.getSelection();
  const range = new Range();
  let anchor = element.querySelector('#__caret');
  if (anchor) {
    range.setStartAfter(anchor);
    range.setEndAfter(anchor);
    selection.removeAllRanges();
    selection.addRange(range);
    anchor.remove();
    return range.commonAncestorContainer as HTMLElement;
  }
}

export const create_caret = (element, toStart = false) => {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setStartBefore(element.firstChild);
  range.setEndAfter(element.lastChild);
  range.collapse(toStart);
  selection.removeAllRanges();
  selection.addRange(range);
}

const get_html = fragment => {
  const div = document.createElement('p');
  div.appendChild(fragment);
  return div.innerHTML;
}

export const split_element = element => {
  const selectRange = get_range();
  if (!element || !selectRange) return;
  const range = selectRange.cloneRange();
  range.selectNodeContents(element);
  range.setStart(selectRange.endContainer, selectRange.endOffset);
  const c2 = range.cloneContents();
  element.firstChild && range.setStart(element.firstChild, 0);
  range.setEnd(selectRange.endContainer, selectRange.endOffset);
  const c1 = range.cloneContents();
  return [get_html(c1), get_html(c2)];
}