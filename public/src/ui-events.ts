import app from 'apprun';

window.onkeydown = (e) => {
  if (e.key === 'Enter') {
    const sel = window.getSelection();
    app.run('@search', sel?.toString());
  }
}

let last;
window.onmousemove = (e) => {
  const element = document.elementFromPoint(e.clientX, e.clientY).closest('.block');
  last && last.classList.remove('active');
  last = element;
  if (element) {
    element.classList.add('active');
    // console.log(element.querySelectorAll('.block-content')[0]);
    // element.querySelectorAll('.block-content')[0]?.setAttribute('contenteditable', 'true');
    e.stopPropagation();
  }
}
