const { app, Component } = window as any;


const onclose = (e) => {
  console.log('close', e);
}

const onsubmit = (e) => {
  console.log('submit', e);
  e.target.closest('dialog').close();
}

class CommandPalette extends Component {
  state = '';
  view = (state) => <dialog ref={e => e.show()} onclose={onclose}>
    <form method="dialog" onsubmit={onsubmit}>
      <input type="text" placeholder="Command..." />
    </form>
  </dialog>
}

export default () => {
  app.on('@command-palette', e => new CommandPalette().start('for-popups'));
}