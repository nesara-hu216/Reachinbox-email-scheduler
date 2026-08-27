"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../utils/logger");
class EmailService {
    /**
     * Transports and sends an outbound email via Nodemailer + Ethereal SMTP.
     * Extracts and returns the Ethereal HTML test preview URL for dashboard inspection.
     */
    static async sendMail(options) {
        let ethUser = options.etherealUser;
        let ethPass = options.etherealPass;
        // Fallback: If credentials missing, dynamically generate an Ethereal test account
        if (!ethUser || !ethPass) {
            logger_1.logger.info('🔑 Auto-generating Ethereal test account credentials...');
            const testAccount = await nodemailer_1.default.createTestAccount();
            ethUser = testAccount.user;
            ethPass = testAccount.pass;
        }
        const transporter = nodemailer_1.default.createTransport({
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
        const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || null;
        logger_1.logger.info({ messageId: info.messageId, recipient: options.recipient, previewUrl }, '✉️ Email delivered successfully via Ethereal SMTP');
        return {
            messageId: info.messageId,
            previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
        };
    }
}
exports.EmailService = EmailService;
