import * as nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const EMAIL_FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@fdaware.ai';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
