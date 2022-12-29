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

export const create_caret = element => {
  const sel = window.getSelection();
  const range = new Range();
  range.setStartAfter(element);
  range.setEndAfter(element);
  sel.removeAllRanges();
  sel.addRange(range);
}