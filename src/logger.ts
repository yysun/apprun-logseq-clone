import app from 'apprun';

export enum LogLevel {
  Debug = 0,
  Info,
  Warn,
  Error
}

let logLevel: LogLevel = localStorage.getItem('logLevel') ?
  parseInt(localStorage.getItem('logLevel')) :
  LogLevel.Info;
  
export const setLogLevel = (level: LogLevel) => {
  logLevel = level;
  localStorage.setItem('logLevel', level.toString());
}

const Log = {
  debug: (...args) => logLevel <= LogLevel.Info && console.debug(...args),
  info: (...args) => logLevel <= LogLevel.Info && console.log(...args),
  warn: (...args) => logLevel <= LogLevel.Warn && console.warn(...args),
  error: (...args) => logLevel <= LogLevel.Error && console.error(...args)
}

app.on('set-log-level', setLogLevel);
app['Log'] = Log;

export default Log;