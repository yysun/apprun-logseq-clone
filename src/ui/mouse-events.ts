let source, target, drag;

export const editor_drag = function (e) {
  e.preventDefault();
  const new_source = e.target.querySelector('.block-content')
  if (!new_source || new_source === source) return;
  source = new_source;
  // source && console.log('drag', source.id);
  drag = true;
};

export const editor_drag_over = function (e) {
  e.preventDefault();
  const new_target = e.target.classList.contains('block-content') ? e.target :
    e.target.closest('.block-content');
  if (!new_target || new_target === target) return;
  new_target.classList.add('active');
  target && target.classList.remove('active');
  target = new_target;
  target && target.classList.add('active');
  // target && console.log('!drag over', target.id);
}

export const editor_drop = function (e) {
  e.preventDefault();
  if (!drag) return;
  drag = false;
  const new_target = e.target.classList.contains('block-content') ? e.target :
    e.target.closest('.block-content');
  if (!new_target) return;
  new_target.classList.remove('active');
  console.log('move', source.id, '==>', new_target.id);
}