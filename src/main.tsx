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

setLogLevel(LogLevel.Info);

shortcuts();
await plugins();
await store();
search();

app.render(document.getElementById('root'), <Layout />);

// Register routes using pretty URLs (no hash navigation)
app.addComponents('my-app', {
  '/': Home,
  '/journals': Journals,
  '/pages': Pages,
  '/page': Page
});

// Register right panel components
new Block().mount('right-panel-main');
new SearchResults().mount('right-panel-main');


