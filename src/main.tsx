// import app from 'apprun';
import Home from './home';
import Layout from './ui/layout';
import plugins from './plugins';
import store from './store';
import app from 'apprun';

await plugins();
await store();

app.render(document.getElementById('root'), <Layout />);
new Home().start('my-app');



