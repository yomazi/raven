import logger from "./logger.js";

const log = {
  info: (operation, message, detail = null) => {
    logger.info(message, { operation, detail });
  },

  error: (operation, message, err = null) => {
    logger.error(message, {
      operation,
      error: err?.message ?? null,
      detail: err?.stack ?? null,
    });
  },

  warn: (operation, message, detail = null) => {
    logger.warn(message, { operation, detail });
  },
};

export default log;
