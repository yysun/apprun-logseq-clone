import { computePosition, offset, arrow, autoUpdate } from "@floating-ui/dom";

export default async () => {

  let cleanup;
  window.addEventListener('mousedown', (e) => {
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
  });
}