import Group from "../models/Group.js";
import ContactsRepository from "./contacts.repository.js";

class ContactsService {
  static async getAllContacts() {
    const contacts = await ContactsRepository.findAll();

    return contacts;
  }

  static async getContact(id) {
    const contact = await ContactsRepository.findOne(id);

    return contact;
  }

  static async addContact(params) {
    const contact = await ContactsRepository.create(params);

    return contact;
  }

  static async updateContact(id, params) {
    const allowed = ["name", "email"];
    const updates = {};

    for (const key of allowed) {
      if (key in params) updates[key] = params[key];
    }

    const contact = await ContactsRepository.upsertOne(id, updates);

    return contact;
  }

  static async deleteContact(id) {
    const result = await ContactsRepository.delete(id);

    if (result) {
      // Drop the contact from any groups it belonged to, so groups never
      // hold onto references to a contact that no longer exists.
      await Group.updateMany({ contacts: id }, { $pull: { contacts: id } });
    }

    return result;
  }
}

export default ContactsService;
