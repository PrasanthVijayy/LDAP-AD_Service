import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf, colorize, errors } = format;

// Define custom log levels and colors
const customLevels = {
  levels: {
    success: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  colors: {
    success: "green", // Success logs
    info: "magenta", // Info logs
    warn: "yellow", // Warning logs
    error: "red", // Errors logs
  },
};

// Custom log format (Square brackets around log level)
const logFormat = printf(({ level, message, timestamp, stack }) => {
  // return `${timestamp} [${level}]: ${stack || message}`;
  return `${stack || message}`;
});

// Initialize Winston Logger with custom levels
const logger = createLogger({
  levels: customLevels.levels,
  level: "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport with colorization
    new transports.Console({
      level: "error",
      format: combine(
        colorize({ all: true, colors: customLevels.colors }),
        logFormat
      ),
    }),
    // File transport for general logs without colorization
    new transports.File({
      filename: "logs/app.log",
      level: "warn", // Setting highest log level
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: combine(timestamp(), logFormat),
    }),
    // File transport for error logs without colorization
    new transports.File({
      filename: "logs/errors.log",
      level: "error", // Setting highest log level
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: combine(timestamp(), logFormat),
    }),
  ],
  exitOnError: false, // Prevents app from crashing on unhandled errors
});

export default logger;
