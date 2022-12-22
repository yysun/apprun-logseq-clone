import app from 'apprun';
import { open_editor, close_editor } from './editor';
import { computePosition, offset, arrow, autoUpdate } from "@floating-ui/dom";

let editing_block, selected_block;

function select(block) {
  if (block === selected_block) return;
  if (selected_block) {
    selected_block.classList.remove('selected');
  }
  selected_block = block;
  if (selected_block) {
    selected_block.classList.add('selected');
  }
}

function edit(block) {
  if (editing_block) {
    close_editor();
  }
  editing_block = block;
  if (editing_block) {
    select(editing_block);
    open_editor(editing_block);
  }
}

function move(sel) {
  let el = document.querySelector('.block-content.selected');
  if (!el) {
    el = document.querySelector('.block-content:hover');
    sel = 0;
  }
  if (!el) return;
  const all = Array.from(document.querySelectorAll('.block-content'));
  el = all[all.indexOf(el) + sel];
  if (el) {
    select(el);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// window.onkeydown = (e) => {
//   if (editing_block) {
//     if (e.key === 'Escape') {
//       edit(null);
//     }
//   } else {
//     if (e.key === 'F1') {
//       e.preventDefault();
//       const sel = window.getSelection();
//       document.querySelector('#main-panel').scrollTop = 0;
//       app.run('@search', sel?.toString());
//     } else if (e.key === 'ArrowDown') {
//       move(1);
//       e.preventDefault();
//     } else if (e.key === 'ArrowUp') {
//       move(-1);
//       e.preventDefault();
//     } else if (e.key === 'Enter') {
//       const el = document.querySelector('.block-content.selected')
//         || document.querySelector('.block-content:hover');
//       if (el) {
//         edit(el);
//         e.preventDefault();
//       }
//     }
//   }
// }

// window.onmousedown = (e) => {
//   const target = document.elementFromPoint(e.clientX, e.clientY);
//   if (target?.id === 'editor') return;
//   const element = document.elementFromPoint(e.clientX, e.clientY).closest('.block-content');
//   if (element) {
//     if (element === editing_block) return;
//     if (element === selected_block) {
//       edit(element);
//       return;
//     }
//     if (editing_block && element !== editing_block) {
//       edit(null);
//     }
//     select(element);
//     e.stopPropagation();
//   } else {
//     edit(null);
//     select(null);
//   }
// }


let cleanup;
window.onmousedown = (e) => {

  const floating = document.getElementById("floating");
  const arrowEl = document.getElementById("arrow");
  const element = document.elementFromPoint(e.clientX, e.clientY).closest('.block-content');

  if (!element) {
    floating.style.display = "none";
    cleanup && cleanup();
    return;
  }

  floating.style.display = "block";
  const updatePosition = () => {
    computePosition(element, floating, {
      placement: "top",
      middleware: [offset(10), arrow({ element: arrowEl })]
    }).then(({ x, y, middlewareData }) => {
      Object.assign(floating.style, {
        top: `${y}px`,
        left: `${x}px`
      });
      const { x: arrowX } = middlewareData.arrow ?? {};
      Object.assign(arrowEl.style, {
        left: `${arrowX}px`,
        top: `${floating.offsetHeight - 1}px`,
        transform: 'scaleY(-1)'
      });
    });
  }
  cleanup = autoUpdate(element, floating, updatePosition);
  updatePosition();
}