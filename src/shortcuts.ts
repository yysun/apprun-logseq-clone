import app from "apprun"

const shortcuts = {
  "ctrl+f": "@search",
  "meta+f": "@search",
}
const run_shortcut = shortcut => {
  const command = shortcuts[shortcut];
  if (command) app.run(command);
}
export default () => {
  window.onkeydown = (e) => {
    const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
    const shortcut = `${ctrlKey ? 'ctrl+' : ''}${metaKey ? 'meta+' : ''}${shiftKey ? 'shift+' : ''}${altKey ? 'alt+' : ''}${key.toLowerCase()}`
    run_shortcut(shortcut);
  }
}
