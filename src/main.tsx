import app from 'apprun';
import { setLogLevel, LogLevel } from './logger';
import shortcuts from './shortcuts';
import plugins from './plugins';
import store from './store';
import search from './search';
import SearchResults from './ui/search';
import Layout from './ui/components/layout';
import Home from './ui/home';
import Journals from './ui/journals';
import Block from './ui/block';
import Pages from './ui/pages';
import Page from './ui/page';

setLogLevel(LogLevel.Warn);

app['no-init-route'] = true;
app.render(document.getElementById('root'), <Layout />);

shortcuts();
await plugins();
await store();
search();

new Pages().mount('my-app');
new Journals().mount('my-app');
new Block().mount('my-app');
new Page().mount('my-app');
new SearchResults().mount('right-panel-main');
new Home().start('my-app');

