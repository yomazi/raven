import Contact from "../models/Contact.js";

class ContactsRepository {
  static async findAll() {
    const contacts = await Contact.find().sort({ name: 1 }).lean();

    return contacts;
  }

  static async findOne(id) {
    const contact = await Contact.findById(id).lean();

    return contact;
  }

  static async create(params) {
    const { name, email } = params;
    const contact = await Contact.create({ name: name.trim(), email: email.trim() });

    return contact;
  }

  static async upsertOne(id, updates) {
    const contact = await Contact.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return contact;
  }

  static async delete(id) {
    const result = await Contact.findByIdAndDelete(id);

    return result;
  }
}

export default ContactsRepository;
