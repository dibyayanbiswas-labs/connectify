import winston from "winston";
import { env } from "./env";

type LoggerLevel = "error" | "warn" | "info" | "debug";
type LoggerFormat = "pretty" | "json";

const isDevelopment = env.NODE_ENV === "development";

// Production defaults to "info", not "error": winston drops everything below
// the level, and losing warn/info in the first deploy costs more than the volume.
const level: LoggerLevel = env.LOG_LEVEL ?? (isDevelopment ? "debug" : "info");

const formatName: LoggerFormat = env.LOG_FORMAT ?? (isDevelopment ? "pretty" : "json");

// JSON.stringify skips non-enumerable properties, and an Error's message and
// stack are non-enumerable, so { err } would be logged as {}. Convert errors
// in meta once, here, instead of `err instanceof Error ? err.message : ...`
// at every call site.
const serializeErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      info[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
  }
  return info;
});

const format =
  formatName === "pretty"
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        serializeErrors(),
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
          return `${timestamp} [${level}]: ${message}${metaString}`;
        }),
      )
    : winston.format.combine(
        winston.format.errors({ stack: true }),
        serializeErrors(),
        winston.format.timestamp(),
        winston.format.json(),
      );

export const logger = winston.createLogger({
  level: level,
  format: format,
  transports: [new winston.transports.Console()],
});
