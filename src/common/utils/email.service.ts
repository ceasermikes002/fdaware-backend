import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { emailTransporter, EMAIL_FROM } from '../../config/email.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  async sendTemplateMail({
    to,
    subject,
    templateName,
    context,
  }: {
    to: string;
    subject: string;
    templateName: string;
    context: Record<string, any>;
  }) {
    const templatePath = path.join(__dirname, '../../../templates', `${templateName}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const compiledTemplate = handlebars.compile(source);
    const html = compiledTemplate(context);

    await emailTransporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  }
} 