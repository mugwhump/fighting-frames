const { log, ExpressAPILogMiddleware } = require('@rama41222/node-logger');

const logger = log({ console: true, file: false, label: 'ff-server' });

export default logger;

/*
can call logger.info('bla'), logger.error('ble'), etc
error: 0,
warn: 1,
info: 2,
http: 3,
verbose: 4,
debug: 5,
silly: 6
*/
