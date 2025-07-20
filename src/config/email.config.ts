import * as nodemailer from 'nodemailer';

export const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@fdaware.ai';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'; 