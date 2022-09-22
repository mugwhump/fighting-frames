const { log, ExpressAPILogMiddleware } = require('@rama41222/node-logger');

const logger = log({ console: true, file: false, label: 'ff-server' });

module.exports = logger;
