import app from 'apprun';
import Home from './home';
import Journals from './ui/journals';
import Pages from './ui/pages';
import Layout from './ui/layout';
import plugins from './plugins';
import store from './store';
import shortcuts from './shortcuts';
import editor from './editor';

shortcuts();
editor();
await plugins();
await store();

app.render(document.getElementById('root'), <Layout />);
new Pages().mount('my-app');
new Journals().mount('my-app');
new Home().start('my-app');




