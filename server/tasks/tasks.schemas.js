import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

const VALID_PRIORITIES = ["urgent", "high", "medium", "low"];
const VALID_STATUSES = ["open", "resolved", "blocked", "shrug"];
const VALID_SORT_FIELDS = ["createdAt", "updatedAt"];
const VALID_SORT_ORDERS = ["asc", "desc"];

class TasksSchemas {
  static getAllTasks = {
    headers: authHeaderSchema,
    query: Joi.object({
      showFolderId: Joi.string(),
      linked: Joi.boolean(),
      status: Joi.string().valid(...VALID_STATUSES),
      priority: Joi.string().valid(...VALID_PRIORITIES),
      sort: Joi.string().valid(...VALID_SORT_FIELDS),
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
        .valid(...VALID_PRIORITIES)
        .default("medium"),
      status: Joi.string()
        .valid(...VALID_STATUSES)
        .default("open"),
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
      priority: Joi.string().valid(...VALID_PRIORITIES),
      status: Joi.string().valid(...VALID_STATUSES),
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
