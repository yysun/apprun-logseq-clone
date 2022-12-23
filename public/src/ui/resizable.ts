// https://github.com/phuocng/html-dom/tree/master/assets/demo/create-resizable-split-views
export default function (resizer) {
  const direction = resizer.getAttribute('data-direction') || 'horizontal';
  const prevSibling = resizer.previousElementSibling;
  const nextSibling = resizer.nextElementSibling;

  // The current position of mouse
  let x = 0;
  let y = 0;
  // let prevSiblingHeight = 0;
  // let prevSiblingWidth = 0;

  let rect1, rect2;

  // Handle the mousedown event
  // that's triggered when user drags the resizer
  const mouseDownHandler = function (e) {
    resizer.classList.add('active');
    // Get the current mouse position
    x = e.clientX;
    y = e.clientY;
    rect1 = prevSibling.getBoundingClientRect();
    rect2 = nextSibling.getBoundingClientRect();

    // prevSiblingHeight = rect.height;
    // prevSiblingWidth = rect.width;
    prevSibling.style.userSelect = 'none';
    prevSibling.style.pointerEvents = 'none';
    nextSibling.style.userSelect = 'none';
    nextSibling.style.pointerEvents = 'none';
    // Attach the listeners to `document`
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  };

  const mouseMoveHandler = function (e) {
    // How far the mouse has been moved
    const dx = e.clientX - x;
    const dy = e.clientY - y;

    switch (direction) {
      case 'vertical':
        prevSibling.style.height = `${rect1.height + dy}px`;
        nextSibling.style.height = `${rect2.height - dy}px`;
        break;
      case 'horizontal':
      default:
        prevSibling.style.width = `${rect1.width + dx}px`;
        nextSibling.style.width = `${rect2.width - dx}px`;
        break;
    }
    // const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    // resizer.style.cursor = cursor;
    // document.body.style.cursor = cursor;
  };

  const mouseUpHandler = function () {
    resizer.classList.remove('active');

    // resizer.style.removeProperty('cursor');
    // document.body.style.removeProperty('cursor');

    prevSibling.style.removeProperty('user-select');
    prevSibling.style.removeProperty('pointer-events');

    nextSibling.style.removeProperty('user-select');
    nextSibling.style.removeProperty('pointer-events');

    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  };

  // Attach the handler
  resizer.addEventListener('mousedown', mouseDownHandler);
};