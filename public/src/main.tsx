// import app from 'apprun';
import Home from './home';
import Layout from './ui/layout';
import plugins from './plugins';
import model from './model';

await plugins();
await model();

new Layout().start(document.body);
new Home().start('my-app');



