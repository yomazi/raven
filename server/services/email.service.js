import nodemailer from "nodemailer";

import { USER_EMAIL } from "../utilities/constants.js";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class EmailService {
  static async send({ subject, text, html }) {
    return transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: USER_EMAIL,
      subject,
      text,
      html,
    });
  }

  static async sendApiToken(apiToken) {
    const subject = "Your Raven API Token";
    const text = `Here is your Raven API token:\n\n${apiToken}\n\nKeep it safe!`;

    await EmailService.send({ subject, text });
  }
}

export default EmailService;
