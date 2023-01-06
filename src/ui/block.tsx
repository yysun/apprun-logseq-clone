import { app, Component } from 'apprun';

export default class extends Component {
  state = {}

  view = state => <>
    <div>
      {state}
    </div>
  </>
  update = {
    '#block': (_, id) => {
      if (location.hash.startsWith('#block')) return id;
    }
  }
}