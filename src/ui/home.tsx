import { app, Component } from 'apprun';
import { dirHandle, hasAccess, select_dir, grant_access } from '../store';

export default class extends Component {
  view = () => {
    return !dirHandle ? <button $onclick={select_dir}>Open...</button> :
      !hasAccess ? <button $onclick={grant_access}>Grant access to directory: "{dirHandle.name}"</button> : ''

  }
  rendered = () => {
    if (hasAccess) {
      const hash = location.hash || '#journals';
      history.pushState({}, '', hash);
      app.route(hash);
    }
  }
}