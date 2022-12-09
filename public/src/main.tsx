import app from 'apprun';
import Home from './home';
import Layout from './layout';

app.render(document.body, <Layout />);
new Home().start('my-app');



