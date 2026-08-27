import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface SendMailOptions {
  senderEmail: string;
  senderName: string;
  etherealUser: string;
  etherealPass: string;
  recipient: string;
  subject: string;
  body: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | null;
}

export class EmailService {
  /**
   * Transports and sends an outbound email via Nodemailer + Ethereal SMTP.
   * Extracts and returns the Ethereal HTML test preview URL for dashboard inspection.
   */
  public static async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    let ethUser = options.etherealUser;
    let ethPass = options.etherealPass;

    // Fallback: If credentials missing, dynamically generate an Ethereal test account
    if (!ethUser || !ethPass) {
      logger.info('🔑 Auto-generating Ethereal test account credentials...');
      const testAccount = await nodemailer.createTestAccount();
      ethUser = testAccount.user;
      ethPass = testAccount.pass;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // TLS
      auth: {
        user: ethUser,
        pass: ethPass,
      },
    });

    const mailOptions = {
      from: `"${options.senderName}" <${options.senderEmail || ethUser}>`,
      to: options.recipient,
      subject: options.subject,
      text: options.body,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
              <h2 style="color: #4F46E5;">${options.subject}</h2>
              <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-top: 10px;">
                ${options.body.replace(/\n/g, '<br/>')}
              </div>
              <footer style="margin-top: 20px; font-size: 12px; color: #6B7280;">
                Sent via ReachInbox Email Scheduler Engine
              </footer>
            </div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    logger.info(
      { messageId: info.messageId, recipient: options.recipient, previewUrl },
      '✉️ Email delivered successfully via Ethereal SMTP'
    );

    return {
      messageId: info.messageId,
      previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
    };
  }
}
