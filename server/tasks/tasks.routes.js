import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./tasks.controller.js";
import Schemas from "./tasks.schemas.js";

import express from "express";
const router = express.Router();

router.get("/tasks", validate(Schemas.getAllTasks), validateApiToken, Controller.getAllTasks);
router.get("/tasks/:id", validate(Schemas.getTask), validateApiToken, Controller.getTask);
router.post("/tasks", validate(Schemas.addTask), validateApiToken, Controller.addTask);
router.patch("/tasks/:id", validate(Schemas.updateTask), validateApiToken, Controller.updateTask);
router.delete("/tasks/:id", validate(Schemas.deleteTask), validateApiToken, Controller.deleteTask);

export default router;
