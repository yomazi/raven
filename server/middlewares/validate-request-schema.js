import createError from "http-errors";

export const validate = (schemas) => (req, res, next) => {
  try {
    Object.entries(schemas).forEach(([key, schema]) => {
      if (schema) {
        const { value, error } = schema.validate(req[key], { abortEarly: false });

        if (error) {
          const message = error.details.map((detail) => detail.message).join(", ");

          throw new createError.BadRequest(message);
        }

        if (key === "body") {
          req[key] = value;
        } else {
          Object.defineProperty(req, key, { value, writable: true, configurable: true });
        }
      }
    });

    next();
  } catch (error) {
    next(error);
  }
};
