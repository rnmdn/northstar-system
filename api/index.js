const { createServer } = require('../server');
let server;
module.exports = (req, res) => {
  server ||= createServer();
  return server.listeners('request')[0](req, res);
};
