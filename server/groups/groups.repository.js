import Group from "../models/Group.js";

class GroupsRepository {
  static async findAll() {
    const groups = await Group.find().sort({ name: 1 }).populate("contacts").lean();

    return groups;
  }

  static async findOne(id) {
    const group = await Group.findById(id).populate("contacts").lean();

    return group;
  }

  static async create(params) {
    const { name, contacts } = params;
    const group = await Group.create({ name: name.trim(), contacts: contacts ?? [] });

    return GroupsRepository.findOne(group._id);
  }

  static async upsertOne(id, updates) {
    await Group.findByIdAndUpdate(id, { $set: updates }, { runValidators: true });

    return GroupsRepository.findOne(id);
  }

  static async delete(id) {
    const result = await Group.findByIdAndDelete(id);

    return result;
  }
}

export default GroupsRepository;
