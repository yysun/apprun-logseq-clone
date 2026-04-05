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
import PageWithOutliner from './ui/page-with-outliner';

setLogLevel(LogLevel.Info);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

app.render(rootElement, <Layout />);
app.addComponents('my-app', {
  '/': Home,
  '/journals': Journals,
  '/pages': Pages,
  '/page': PageWithOutliner
});

// Register right panel components
new Block().mount('right-panel-main');
new SearchResults().mount('right-panel-main');

shortcuts();
await plugins();
await store();
search();