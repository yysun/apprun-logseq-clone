import app from 'apprun';


function select(sel, e) {
  let el = document.querySelector('.block-content.selected');
  if (!el) return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll('.block-content'));
  el = all[all.indexOf(el) + sel];
  if (el) {
    document.querySelector('.block-content.selected')?.classList.remove('selected');
    el.classList.add('selected');
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}


window.onkeydown = (e) => {
  if (e.key === 'F1') {
    e.preventDefault();
    const sel = window.getSelection();
    document.querySelector('#main-panel').scrollTop = 0;
    app.run('@search', sel?.toString());
  } else if (e.key === 'ArrowDown') {
    select(1, e);
  } else if (e.key === 'ArrowUp') {
    select(-1, e);
  }
}

window.onmousedown = (e) => {
  const element = document.elementFromPoint(e.clientX, e.clientY).closest('.block-content');
  if (element) {
    document.querySelector('.block-content.selected')?.classList.remove('selected');
    element.classList.add('selected');
    element.setAttribute('contenteditable', 'true');
    e.stopPropagation();
  }
}
