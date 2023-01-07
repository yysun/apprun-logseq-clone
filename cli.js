#!/usr/bin/env node
const program = require('commander');
const server = require('./server.js');

program
  .arguments('[root]', 'root directory', '.')
  .option('-p, --port [port]', 'local server port', 8080)
  .action((root, options) => {
    server(root || '.', options);
  });

program.parse(process.argv);