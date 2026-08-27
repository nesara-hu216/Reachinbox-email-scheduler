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
export declare class EmailService {
    /**
     * Transports and sends an outbound email via Nodemailer + Ethereal SMTP.
     * Extracts and returns the Ethereal HTML test preview URL for dashboard inspection.
     */
    static sendMail(options: SendMailOptions): Promise<SendMailResult>;
}
