import path from "path";
import { Writable } from "stream";
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import LogEntry from "../models/LogEntry.js";

const { combine, timestamp, json, errors } = format;

class MongoTransport extends transports.Stream {
  constructor(opts = {}) {
    const stream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    super({ ...opts, stream });
  }

  async log(info, callback) {
    try {
      await LogEntry.create({
        timestamp: new Date(info.timestamp),
        level: info.level,
        operation: info.operation ?? null,
        message: info.message,
        detail: info.detail ?? null,
        error: info.error ?? null,
      });
    } catch (err) {
      console.error("[Logger] MongoDB write failed:", err.message);
    }
    callback();
  }
}

const logger = createLogger({
  level: "info",
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new DailyRotateFile({
      dirname: path.resolve("logs"),
      filename: "raven-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "90d",
      zippedArchive: true,
    }),
    new MongoTransport(),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, operation, detail, error }) => {
          const op = operation ? ` [${operation}]` : "";
          const det = detail ? ` ${JSON.stringify(detail)}` : "";
          const err = error ? ` — ${error}` : "";
          return `${timestamp} ${level}${op}: ${message}${det}${err}`;
        })
      ),
    })
  );
}

export default logger;
