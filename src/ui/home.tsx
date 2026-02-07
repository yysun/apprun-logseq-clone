import { app, Component } from 'apprun';
import { dirHandle, hasAccess, select_dir, grant_access } from '../store';

export default class extends Component {
  state = {};

  view = () => {
    return !dirHandle ? <button $onclick={select_dir}>Open...</button> :
      !hasAccess ? <button $onclick={grant_access}>Grant access to directory: "{dirHandle.name}"</button> : ''
  }

  update = {
    '/': (state) => {
      if (hasAccess) {
        window.location.href = '/journals';
        return;  // Side effect only - no re-render needed
      }
      return state;
    }
  }
}