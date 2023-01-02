import app from 'apprun';
import Home from './home';
import Journals from './ui/journals';
import Pages from './ui/pages';
import Layout from './ui/layout';
import plugins from './plugins';
import store from './store';
import shortcuts from './shortcuts';

app['no-init-route'] = true;
app.render(document.getElementById('root'), <Layout />);

shortcuts();
await plugins();
await store();

new Pages().mount('my-app');
new Journals().mount('my-app');
new Home().start('my-app');




