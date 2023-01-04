import app from "apprun"
import Log from "../logger";

export const shortcuts = {
  "ctrl+p": "@search",
  "meta+p": "@search",
  "ctrl+shift+p": "@command-palette",
  "meta+shift+p": "@command-palette",
}

const queue = [];
let timer, queue_timer;

const run_shortcut = (shortcut, e) => {
  const command = shortcuts[shortcut];
  Log.info(shortcut, '==>', command);
  if (!command) return;
  else if (typeof command === 'string') app.run(command);
  else if (typeof command === 'function') command(e);
}

const handle_hotkeys = (e) => {
  if(!queue.length) return;
  run_shortcut(queue[0], e);
  for (let i = 1; i < queue.length; i++) {
    const shortcut = queue.slice(0, i + 1).join(',');
    run_shortcut(shortcut, e);
  }
  queue.length = 0;
  timer && clearTimeout(timer);
  timer = null;
}

export default () => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift') return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !e.key.startsWith('F')) return;
    const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
    const hotkey= `${ctrlKey ? 'ctrl+' : ''}${metaKey ? 'meta+' : ''}${shiftKey ? 'shift+' : ''}${altKey ? 'alt+' : ''}${key.toLowerCase()}`
    queue_timer && clearTimeout(queue_timer);
    queue_timer = setTimeout(() => {
      queue.push(hotkey);
      timer && clearTimeout(timer);
      timer = setTimeout(handle_hotkeys, 300)
    }, 50);
  })
}

export const add_shortcut = (shortcut, command) => {
  shortcuts[shortcut] = command;
}