import * as nodemailer from 'nodemailer';

function normalize(v?: string | null) {
  if (!v) return '';
  return v.trim().replace(/^['"]|['"]$/g, '');
}

const SMTP_HOST = normalize(process.env.SMTP_HOST) || 'smtp.gmail.com';
const SMTP_PORT = Number(normalize(process.env.SMTP_PORT) || '587');
const SMTP_USER = normalize(process.env.SMTP_USER);
const SMTP_PASS = normalize(process.env.SMTP_PASS);
const SMTP_FROM = normalize(process.env.SMTP_FROM) || normalize(process.env.EMAIL_FROM) || SMTP_USER || 'no-reply@fdaware.ai';

export const emailTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT === 587,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const EMAIL_FROM = SMTP_FROM;

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
