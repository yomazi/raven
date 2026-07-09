import createError from "http-errors";

import ContactsService from "./contacts.service.js";

class ContactsController {
  static async getAllContacts(req, res, next) {
    try {
      const contacts = await ContactsService.getAllContacts();

      res.json({ success: true, contacts });
    } catch (err) {
      next(err);
    }
  }

  static async getContact(req, res, next) {
    try {
      const { id } = req.params;
      const contact = await ContactsService.getContact(id);

      if (!contact) throw createError.NotFound("Contact not found");
      res.json({ success: true, contact });
    } catch (err) {
      next(err);
    }
  }

  static async addContact(req, res, next) {
    try {
      const params = { ...req.body };
      const contact = await ContactsService.addContact(params);

      res.status(201).json({ success: true, contact });
    } catch (err) {
      if (err.code === 11000) return next(createError.Conflict("A contact with that email already exists"));
      next(err);
    }
  }

  static async updateContact(req, res, next) {
    try {
      const { id } = req.params;
      const params = { ...req.body };
      const contact = await ContactsService.updateContact(id, params);

      if (!contact) throw createError.NotFound("Contact not found");
      res.json({ success: true, contact });
    } catch (err) {
      if (err.code === 11000) return next(createError.Conflict("A contact with that email already exists"));
      next(err);
    }
  }

  static async deleteContact(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ContactsService.deleteContact(id);

      if (!result) throw createError.NotFound("Contact not found");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export default ContactsController;
