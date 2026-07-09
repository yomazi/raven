import GroupsRepository from "./groups.repository.js";

class GroupsService {
  static async getAllGroups() {
    const groups = await GroupsRepository.findAll();

    return groups;
  }

  static async getGroup(id) {
    const group = await GroupsRepository.findOne(id);

    return group;
  }

  static async addGroup(params) {
    const group = await GroupsRepository.create(params);

    return group;
  }

  static async updateGroup(id, params) {
    const allowed = ["name", "contacts"];
    const updates = {};

    for (const key of allowed) {
      if (key in params) updates[key] = params[key];
    }

    const group = await GroupsRepository.upsertOne(id, updates);

    return group;
  }

  static async deleteGroup(id) {
    const result = await GroupsRepository.delete(id);

    return result;
  }
}

export default GroupsService;
