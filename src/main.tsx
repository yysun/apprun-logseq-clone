import app from 'apprun';
import Home from './home';
import Journals from './ui/journals';
import Pages from './ui/pages';
import Layout from './ui/layout';
import shortcuts from './shortcuts';
import plugins from './plugins';
import store from './store';
import search from './search';
import searchResults from './ui/search-results';

app['no-init-route'] = true;
app.render(document.getElementById('root'), <Layout />);

shortcuts();
await plugins();
await store();
search();

new Pages().mount('my-app');
new Journals().mount('my-app');
new Home().start('my-app');
new searchResults().mount('right-panel-main');
