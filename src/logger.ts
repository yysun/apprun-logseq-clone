enum LogLevel {
  Debug = 0,
  Info,
  Warn,
  Error
}

let logLevel: LogLevel = LogLevel.Info;
export const setLogLevel = (lv: LogLevel) => logLevel = lv;
export default {
  debug: (...args) => logLevel <= LogLevel.Info && console.debug(...args),
  info: (...args) => logLevel <= LogLevel.Info && console.log(...args),
  warn: (...args) => logLevel <= LogLevel.Warn && console.warn(...args),
  error: (...args) => logLevel <= LogLevel.Error && console.error(...args)
}