import envConfig from '@support/envConfig';
import { InboxDto, MailSlurp } from 'mailslurp-client';

export interface EmailInboxParams {
  inbox: InboxDto;
  timeout?: number;
  unreadOnly?: boolean;
}
export class MessageFeed {
  mailSlurp: MailSlurp;
  constructor() {
    this.mailSlurp = new MailSlurp({
      apiKey: envConfig.MAILSLURP_API_KEY,
    });
  }

  async createNewEmail() {
    const inbox = await this.mailSlurp.createInbox();
    return { email: inbox.emailAddress, inbox };
  }

  async getInboxById(id: string) {
    return this.mailSlurp.getInbox(id);
  }

  async getLastEmailInbox({ inbox, timeout = 50000, unreadOnly }: EmailInboxParams) {
    const inboxFound = await this.mailSlurp.getInbox(inbox.id);
    return this.mailSlurp.waitForLatestEmail(inboxFound.id, timeout, unreadOnly);
  }

  async getClickToPayEmailOTP(params: EmailInboxParams) {
    const otpRegex = /<span[^>]*>(\d+)<\/span>[^<]*?es tu código\./;
    const emailContent = await this.getLastEmailInbox(params);
    const match = emailContent.body.match(otpRegex);
    return match ? match[1] : null;
  }

  async getDeunaCheckoutEmailOTP(params: EmailInboxParams) {
    const otpRegex = /Tu código es:\s*<strong>(\d+)<\/strong>/;
    let emailContent;
    try {
      emailContent = await this.getLastEmailInbox(params);
    } catch (err) {
      const allEmails = await this.mailSlurp.getEmails(params.inbox.id);
      throw new Error(
        `[MAILSLURP INFRA] OTP email never arrived in inbox ${params.inbox.id} (${params.inbox.emailAddress}). ` +
          `Emails found: ${allEmails.length}. Original error: ${err.message}`
      );
    }
    const match = emailContent.body.match(otpRegex);
    if (!match) throw new Error('OTP code not found in email body');
    return match[1];
  }

  async getDeunaVoucherEmail(params, regex: RegExp) {
    const emailContent = await this.getLastEmailInbox(params);
    const match = emailContent.body.match(regex);
    return match[1];
  }

  async deleteEmail(emailAddress: string) {
    return this.mailSlurp.deleteInbox(emailAddress);
  }
}
