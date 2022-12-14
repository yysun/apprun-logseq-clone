import app from 'apprun';
import Home from './home';
import Layout from './layout';
import './ui-events';
import './data';


app.render(document.body, <Layout />);
new Home().start('my-app');



