// @ts-check
const { dirname, join, relative } = require('path');
const { fileURLToPath } = require('url');
const { cyan, yellow, blue, green, magenta, gray, red } = require('chalk');
const express = require('express');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');

module.exports = function (root, { port }) {

  const app = express();
  const root_path = join(__dirname, root);
  const code_path = join(__dirname, 'public/dist');

  app.use(express.static(root_path));
  app.use(express.static(code_path));

  app.get('*', function (request, response) {
    response.sendFile(join(code_path, 'index.html'));
  });

  const server = app.listen(port, function () {
    const wss = new WebSocketServer({ server });
    wss.on('connection', function connection(ws) {
      // console.log('a client connected')
      ws.on('message', function incoming(message) {
        console.log('received payload: %s', message);
      });
    });

    wss.on('listening', function listening() {
      // console.log(`started listening on ${port}`)
    })

    const send = data => {
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          console.log(green(`\tWS Sending ${data}`));
          client.send(data);
        }
      });
    }

    let timer = null;
    chokidar.watch(root_path).on('all', (event, path) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // console.log(gray(`Sending change: ${event}, ${root_path}`));
        send(JSON.stringify({ event, path: relative(root_path, path) }));
      }, 500);
    });

    console.log('Your app is listening on ' + yellow(`http://localhost:${port}`));
    console.log(blue(`Serving from:${root_path}`));
  });
}