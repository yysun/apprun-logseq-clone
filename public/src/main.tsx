import app from 'apprun';
import Home from './home';
import Layout from './ui/layout';
import './data';

// import load_plugins from './plugins';
// await load_plugins();

new Layout().start(document.body);
new Home().start('my-app');



