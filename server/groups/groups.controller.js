import createError from "http-errors";

import GroupsService from "./groups.service.js";

class GroupsController {
  static async getAllGroups(req, res, next) {
    try {
      const groups = await GroupsService.getAllGroups();

      res.json({ success: true, groups });
    } catch (err) {
      next(err);
    }
  }

  static async getGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await GroupsService.getGroup(id);

      if (!group) throw createError.NotFound("Group not found");
      res.json({ success: true, group });
    } catch (err) {
      next(err);
    }
  }

  static async addGroup(req, res, next) {
    try {
      const params = { ...req.body };
      const group = await GroupsService.addGroup(params);

      res.status(201).json({ success: true, group });
    } catch (err) {
      if (err.code === 11000) return next(createError.Conflict("A group with that name already exists"));
      next(err);
    }
  }

  static async updateGroup(req, res, next) {
    try {
      const { id } = req.params;
      const params = { ...req.body };
      const group = await GroupsService.updateGroup(id, params);

      if (!group) throw createError.NotFound("Group not found");
      res.json({ success: true, group });
    } catch (err) {
      if (err.code === 11000) return next(createError.Conflict("A group with that name already exists"));
      next(err);
    }
  }

  static async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      const result = await GroupsService.deleteGroup(id);

      if (!result) throw createError.NotFound("Group not found");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export default GroupsController;
