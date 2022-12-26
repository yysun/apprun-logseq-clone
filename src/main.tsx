import app from 'apprun';
import Home from './home';
import Journals from './ui/journals';
import Layout from './ui/layout';
import plugins from './plugins';
import store from './store';
import './ui-events';

await plugins();
await store();

app.render(document.getElementById('root'), <Layout />);
new Home().mount('my-app');
new Journals().mount('my-app');

app.run('#journals');



