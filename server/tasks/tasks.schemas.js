import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

import { TASK_PRIORITY, TASK_STATUS } from "../../shared/constants/tasks.js";

const VALID_SORT_ORDERS = ["asc", "desc"];

const commaSeparatedValid = (validValues) =>
  Joi.string().custom((value, helpers) => {
    const parts = value.split(",").map((v) => v.trim());
    const invalid = parts.filter((p) => !validValues.includes(p));
    if (invalid.length > 0) {
      return helpers.error("any.invalid");
    }
    return value;
  });

class TasksSchemas {
  static getAllTasks = {
    headers: authHeaderSchema,
    query: Joi.object({
      showFolderId: Joi.string(),
      linked: Joi.boolean(),
      status: commaSeparatedValid(TASK_STATUS),
      priority: commaSeparatedValid(TASK_PRIORITY),
      //      sort: Joi.string().valid(...VALID_SORT_FIELDS),
      order: Joi.string().valid(...VALID_SORT_ORDERS),
    }),
  };

  static getTask = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static addTask = {
    headers: authHeaderSchema,
    body: Joi.object({
      showFolderId: Joi.string().allow(null, ""),
      description: Joi.string().trim().min(1).required(),
      priority: Joi.string()
        .valid(...TASK_PRIORITY)
        .default("medium"),
      status: Joi.string()
        .valid(...TASK_STATUS)
        .default("to_do"),
      notes: Joi.string().allow("").default(""),
    }),
  };

  static updateTask = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      showFolderId: Joi.string().allow(null, ""),
      description: Joi.string().trim().min(1),
      priority: Joi.string().valid(...TASK_PRIORITY),
      status: Joi.string().valid(...TASK_STATUS),
      notes: Joi.string().allow(""),
    }).min(1), // require at least one field
  };

  static deleteTask = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };
}

export default TasksSchemas;
