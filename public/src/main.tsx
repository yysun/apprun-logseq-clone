// import app from 'apprun';
import Home from './home';
import Layout from './ui/layout';
import plugins from './plugins';
import store from './store';

await plugins();
await store();

new Layout().start(document.body);
new Home().start('my-app');



