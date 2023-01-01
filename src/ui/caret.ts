let saved_caret;

const get_range = () => {
  const selection = window.getSelection();
  return selection && selection.rangeCount ? selection.getRangeAt(0) : null;
}

export const save_caret = () => {
  const range = get_range();
  const cursor = document.createElement('span');
  cursor.hidden = true;
  range.insertNode(cursor);
  saved_caret = cursor;
}

export const restore_caret = () => {
  if (saved_caret) return;
  const sel = window.getSelection();
  const range = new Range();
  range.setStartAfter(saved_caret);
  range.setEndAfter(saved_caret);
  sel.removeAllRanges();
  sel.addRange(range);
  setTimeout(() => saved_caret.remove(), 150);
}

export const create_caret = (element, atStart = false) => {
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(atStart);
  selection.removeAllRanges();
  selection.addRange(range);
}
export const split_content = element => {

  const selection = window.getSelection();

  if (!selection.rangeCount) {
    return;
  }

  const selectRange = selection.getRangeAt(0);
  if (!element) return;
  selectRange.deleteContents();
  const range = selectRange.cloneRange();
  range.selectNodeContents(element);
  range.setStart(selectRange.endContainer, selectRange.endOffset);
  const c2 = range.extractContents();
  range.setStart(selectRange.startContainer, 0);
  const c1 = range.extractContents();
  return [c1, c2];

}