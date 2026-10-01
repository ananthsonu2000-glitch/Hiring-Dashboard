import "server-only";
import nodemailer from "nodemailer";

export class EmailConfigError extends Error {}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new EmailConfigError(
      "Email sending is not configured (EMAIL_USER / EMAIL_APP_PASSWORD missing)."
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from = process.env.EMAIL_USER;
  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });
}
