import { computePosition, offset, arrow, autoUpdate } from "@floating-ui/dom";
const app = window['app'];
export default async () => {

  let cleanup, last_element;

  app.on('@edit-block-begin', e => {
    const floating = document.getElementById("floating");
    const arrowEl = document.getElementById("arrow");
    // const element = document.elementFromPoint(e.clientX, e.clientY)?.closest('.block-content');
    const element = e.target;

    if (element !== last_element) {
      floating.style.display = "none";
      cleanup && cleanup();
    }

    last_element = element;

    floating.style.display = "block";
    const updatePosition = () => {
      computePosition(element, floating, {
        placement: "top-start",
        middleware: [offset(10), arrow({ element: arrowEl })]
      }).then(({ x, y, middlewareData }) => {
        Object.assign(floating.style, {
          top: `${y}px`,
          left: `${x}px`
        });
        const { x: arrowX } = middlewareData.arrow ?? {};
        Object.assign(arrowEl.style, {
          // left: `${arrowX}px`,
          left: `10px`,
          top: `${floating.offsetHeight - 1}px`,
          transform: 'scaleY(-1)'
        });
      });
    }
    cleanup = autoUpdate(element, floating, updatePosition);
    updatePosition();
  });
}