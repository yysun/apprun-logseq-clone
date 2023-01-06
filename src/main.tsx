import app from 'apprun';
import Home from './ui/home';
import Journals from './ui/journals';
import Pages from './ui/pages';
import Layout from './ui/components/layout';
import shortcuts from './shortcuts';
import plugins from './plugins';
import store from './store';
import search from './search';
import searchResults from './ui/components/search-results';
import Block from './ui/block';

app['no-init-route'] = true;
app.render(document.getElementById('root'), <Layout />);

shortcuts();
await plugins();
await store();
search();

new Pages().mount('my-app');
new Journals().mount('my-app');
new Home().start('my-app');
new Block().mount('my-app');
new searchResults().mount('right-panel-main');

