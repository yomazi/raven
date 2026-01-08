const nodemailer = require("nodemailer");

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
  static async send({ to, subject, text, html }) {
    return transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
  }

  static async sendApiToken(to, apiToken) {
    const subject = "Your Raven API Token";
    const text = `Here is your Raven API token:\n\n${apiToken}\n\nKeep it safe!`;

    await EmailService.send({ to, subject, text });
  }
}

module.exports = EmailService;
