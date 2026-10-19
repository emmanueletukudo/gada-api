import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as QRCode from 'qrcode';

export interface SendAgentInvitePayload {
  email: string;
  url: string;
  eventName: string;
  organizerName: string;
  agentName: string;
}

export interface TicketPassItem {
  ticketId: string;
  qrPayload: string;
  tierName: string;
  guestName?: string;
}

export interface SendTicketConfirmationPayload {
  email: string;
  fullName: string;
  paymentReference: string;
  quantity: number;
  eventName: string;
  tierName: string;
  tierPrice: string;
  currency: string;
  eventDate: Date | string;
  eventEndDate?: string | Date; 
  eventLocation: string;
  tickets: TicketPassItem[];
  isOnline?: boolean;
  meetingLink?: string;
  virtualPlatform?: string;
  meetingPasscode?: string;
}

export interface SendWelcomeEmailPayload {
  email: string;
  firstName?: string;
}

export interface SendEventPublishedPayload {
  email: string;
  organizerName: string;
  eventName: string;
  eventUrl: string;
  eventDate: Date | string;
  eventLocation: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly brevoApiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.senderEmail =
      this.configService.get<string>('SENDER_EMAIL') ||
      'no-reply@gadashield.io';
    this.senderName =
      this.configService.get<string>('SENDER_NAME') || 'Gada Pass';

    if (!this.brevoApiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not defined in environment variables.',
      );
    }
  }

  private async sendBrevoEmail(payload: Record<string, any>): Promise<any> {
    if (!this.brevoApiKey) {
      throw new Error('BREVO_API_KEY is missing.');
    }

    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        payload,
        {
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      this.logger.error('Brevo API request failed:', errorDetails);
      throw new InternalServerErrorException('Failed to send email via Brevo.');
    }
  }

  private getEmailHeaderHtml(): string {
    return `
      <tr>
        <td style="padding-bottom: 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="left" style="vertical-align: middle;">
                <img 
                  src="https://pub-0d201b6612bc47859f4719a27046564f.r2.dev/uploads/gada_pass.png" 
                  alt="Gada Pass" 
                  width="90" 
                  style="display: block; border: 0; outline: none; text-decoration: none;"
                />
              </td>
              <td align="right" style="vertical-align: middle;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right">
                  <tr>
                    <td style="padding-left: 12px; vertical-align: middle;">
                      <a href="https://instagram.com" target="_blank" style="text-decoration: none; display: block;">
                        <img 
                          src="https://pub-0d201b6612bc47859f4719a27046564f.r2.dev/uploads/ig.png" 
                          alt="Instagram" 
                          width="20" 
                          height="20" 
                          style="display: block; border: 0; outline: none; width: 20px; height: 20px;" 
                        />
                      </a>
                    </td>
                    <td style="padding-left: 12px; vertical-align: middle;">
                      <a href="https://x.com" target="_blank" style="text-decoration: none; display: block;">
                        <img 
                          src="https://pub-0d201b6612bc47859f4719a27046564f.r2.dev/uploads/x.png" 
                          alt="X" 
                          width="20" 
                          height="20" 
                          style="display: block; border: 0; outline: none; width: 20px; height: 20px;" 
                        />
                      </a>
                    </td>
                    <td style="padding-left: 12px; vertical-align: middle;">
                      <a href="https://facebook.com" target="_blank" style="text-decoration: none; display: block;">
                        <img 
                          src="https://pub-0d201b6612bc47859f4719a27046564f.r2.dev/uploads/facebook_logo.png" 
                          alt="Facebook" 
                          width="20" 
                          height="20" 
                          style="display: block; border: 0; outline: none; width: 20px; height: 20px;" 
                        />
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  async sendAgentInvite({
    email,
    url,
    eventName,
    organizerName,
    agentName,
  }: SendAgentInvitePayload): Promise<any> {
    const greeting = agentName ? `Hi ${agentName},` : 'Hello,';
    const inviterText = organizerName
      ? `${organizerName} has invited you`
      : 'You have been invited';

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [
        {
          email,
          name: agentName,
        },
      ],
      subject: `Gate Access Pass: You've been invited to manage "${eventName}"`,
      textContent: `
${greeting}

${inviterText} to serve as a Gate Access Operator for "${eventName}".

As a gate operator, you will be authorized to validate check-in passes, sync terminal logs, and process attendee admissions.

Accept your invitation and set up your scanner terminal here:
${url}

If you were not expecting this invitation, you can safely ignore this email.
    `.trim(),
      htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gate Access Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7f7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211b;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f2; padding: 32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px;">
                  
                  <!-- HEADER -->
                  ${this.getEmailHeaderHtml()}

                  <!-- MAIN CONTENT CARD -->
                  <tr>
                    <td>
                      <table role="presentation" width="100%" style="background-color: #ffffff; border: 1px solid #dce1d5; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                        <tr>
                          <td>
                            <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #17211b;">${greeting}</p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              ${inviterText} to serve as a <strong>Gate Access Operator</strong> for the upcoming event:
                            </p>

                            <div style="background-color: #f5f5f6; border: 1px solid #dce1d5; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #6d766d;">
                                Target Event
                              </p>
                              <p style="margin: 0; font-size: 18px; font-weight: 800; color: #17211b;">
                                ${eventName}
                              </p>
                              ${
                                organizerName
                                  ? `<p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #6d766d;">Organized by ${organizerName}</p>`
                                  : ''
                              }
                            </div>

                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              As an assigned gate access operator, you will be authorized to validate check-in passes, sync terminal logs, and process attendee admissions.
                            </p>

                            <div style="text-align: center; margin: 32px 0;">
                              <a href="${url}" target="_blank" style="background-color: #17211b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block;">
                                Accept Pass &amp; Setup Terminal
                              </a>
                            </div>

                            <p style="margin: 0; font-size: 12px; color: #6d766d; text-align: center; word-break: break-all;">
                              Direct link: <a href="${url}" style="color: #17211b;">${url}</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER SECTION -->
                  <tr>
                    <td align="center" style="padding-top: 32px; font-size: 12px; color: #6d766d; line-height: 1.6;">
                      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Gada Pass. All rights reserved.</p>
                      <p style="margin: 0 0 16px 0;">If you were not expecting this invitation, you can safely ignore this email.</p>
                      
                      <p style="margin: 0;">
                        <a href="#" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                        <a href="https://pass.gada.africa/privacy" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Privacy Policy</a> &bull;
                        <a href="https://pass.gada.africa/terms" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Terms of Use</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    };

    return this.sendBrevoEmail(payload);
  }

  async sendTicketConfirmation(
    data: SendTicketConfirmationPayload,
  ): Promise<any> {
    const recipientName = data.fullName || 'Valued Guest';

    const startDate = new Date(data.eventDate);
    const endDate = data.eventEndDate ? new Date(data.eventEndDate) : null;

    const isMultiDay =
      endDate &&
      !isNaN(endDate.getTime()) &&
      (startDate.getFullYear() !== endDate.getFullYear() ||
        startDate.getMonth() !== endDate.getMonth() ||
        startDate.getDate() !== endDate.getDate());

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedStart = startDate.toLocaleString('en-US', options);
    const formattedEnd = endDate
      ? endDate.toLocaleString('en-US', options)
      : '';

    let eventDateHtml = formattedStart;

    if (isMultiDay) {
      eventDateHtml = `
      <span style="display: block; font-size: 13px; color: #17211b;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ff5500; background: #ff5500/10; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">From</span> ${formattedStart}
      </span>
      <span style="display: block; font-size: 13px; color: #17211b; margin-top: 4px;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ff5500; background: #ff5500/10; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">To</span> ${formattedEnd}
      </span>
    `;
    }

    const attachments: { name: string; content: string }[] = [];
    const qrCardsHtml: string[] = [];

    for (let i = 0; i < data.tickets.length; i++) {
      const t = data.tickets[i];
      const attachmentName = `qrcode-${i + 1}.png`;

      const qrCodeDataUrl = await QRCode.toDataURL(t.qrPayload || t.ticketId, {
        width: 280,
        margin: 2,
        color: { dark: '#17211B', light: '#FFFFFF' },
      });

      const base64Image = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

      attachments.push({
        name: attachmentName,
        content: base64Image,
      });

      qrCardsHtml.push(`
      <div style="background-color: #f5f5f6; border: 1px solid #dce1d5; border-radius: 16px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <div style="border-bottom: 1px dashed #dce1d5; padding-bottom: 8px; margin-bottom: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #17211b;">
          Pass #${i + 1} of ${data.tickets.length} &bull; ${t.tierName}
        </div>
        <img src="cid:${attachmentName}" alt="Check-in QR Code Pass ${i + 1}" width="180" height="180" style="display: block; margin: 12px auto; border-radius: 12px;" />
        <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 11px; color: #6d766d;">
          ID: ${t.ticketId}
        </p>
      </div>
    `);
    }

    const virtualAccessHtml =
      data.isOnline && data.meetingLink
        ? `
      <div style="background-color: #17211b; border-radius: 16px; padding: 24px; margin-bottom: 24px; color: #ffffff; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #d6f94a;">
          Virtual Event Access
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #ffffff;">
          Platform: ${data.virtualPlatform ? data.virtualPlatform.replace(/_/g, ' ') : 'Online Stream'}
        </p>
        <a href="${data.meetingLink}" target="_blank" style="display: inline-block; background-color: #ff5500; color: #ffffff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 24px; border-radius: 9999px; text-decoration: none; margin-bottom: ${data.meetingPasscode ? '12px' : '0'};">
          Join Meeting / Stream
        </a>
        ${
          data.meetingPasscode
            ? `
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #dce1d5;">
            Passcode: <strong style="color: #ffffff; font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${data.meetingPasscode}</strong>
          </p>
        `
            : ''
        }
      </div>
    `
        : '';

    const payload = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: data.email, name: recipientName }],
      subject: `Your Pass (${data.quantity} Ticket${data.quantity > 1 ? 's' : ''}) for "${data.eventName}" [${data.paymentReference}]`,
      attachment: attachments,
      htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7f7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #17211b;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f2; padding: 32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px;">
                  
                  <!-- HEADER -->
                  ${this.getEmailHeaderHtml()}

                  <!-- MAIN CONTENT CARD -->
                  <tr>
                    <td>
                      <table role="presentation" width="100%" style="background-color: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                        <tr>
                          <td>

                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #17211b;">
                              Hi ${recipientName},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              Your access passes for <strong>${data.eventName}</strong> have been successfully issued.
                            </p>

                            <!-- EVENT SUMMARY BOX -->
                            <div style="background-color: #f5f5f6; border: 1px solid #dce1d5; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                              <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #6d766d;">
                                Event Details
                              </p>
                              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 800; color: #17211b;">
                                ${data.eventName}
                              </p>
                              <p style="margin: 0 0 4px 0; font-size: 13px; color: #17211b;">
                                <strong>Tiers:</strong> ${data.tierName}
                              </p>
                              <div style="margin: 0 0 8px 0; font-size: 13px; color: #17211b;">
                                <strong>Date${isMultiDay ? 's' : ''}:</strong> 
                                <div style="margin-top: 4px;">
                                  ${eventDateHtml}
                                </div>
                              </div>
                              <p style="margin: 0 0 4px 0; font-size: 13px; color: #17211b;">
                                <strong>Location:</strong> ${data.eventLocation}
                              </p>
                              <p style="margin: 12px 0 0 0; font-size: 12px; font-weight: 600; color: #6d766d;">
                                Reference: <code style="background-color: #e8ede0; padding: 2px 6px; border-radius: 4px;">${data.paymentReference}</code>
                              </p>
                            </div>

                            <!-- VIRTUAL ACCESS (IF ONLINE) -->
                            ${virtualAccessHtml}

                            <!-- PASSES HEADING -->
                            <p style="margin: 24px 0 12px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #6d766d;">
                              Your QR Access Passes
                            </p>

                            <!-- QR PASS CARDS -->
                            ${qrCardsHtml.join('')}

                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER SECTION -->
                  <tr>
                    <td align="center" style="padding-top: 32px; font-size: 12px; color: #6d766d; line-height: 1.6;">
                      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Gada Pass. All rights reserved.</p>
                      <p style="margin: 0 0 16px 0;">Find your next experience or host your own on Gada.</p>
                      
                      <!-- FOOTER LINKS -->
                      <p style="margin: 0;">
                        <a href="#" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                        <a href="https://pass.gada.africa/privacy" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Privacy Policy</a> &bull;
                        <a href="https://pass.gada.africa/terms" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Terms of Use</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    };

    return this.sendBrevoEmail(payload);
  }

  
  async sendOtpEmail(
    email: string,
    otp: string,
    recipientName?: string,
  ): Promise<any> {
    const name = recipientName || 'Valued User';

    const payload = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email, name }],
      subject: `Your Gada Verification Code: ${otp}`,
      htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7f7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #17211b;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f2; padding: 32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px;">
                  
                  <!-- HEADER -->
                  ${this.getEmailHeaderHtml()}

                  <!-- MAIN CONTENT CARD -->
                  <tr>
                    <td>
                      <table role="presentation" width="100%" style="background-color: #ffffff; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                        <tr>
                          <td>
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #17211b;">
                              Hi ${name},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              Please use the confirmation code below to complete your registration or login on Gada. This code is valid for 10 minutes.
                            </p>

                            <!-- OTP CODE HIGHLIGHT BOX -->
                            <div style="background-color: #f5f5f6; border: 1px solid #dce1d5; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
                              <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6d766d;">
                                Your Verification Code
                              </p>
                              <p style="margin: 0; font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #17211b;">
                                ${otp}
                              </p>
                            </div>

                            <p style="margin: 0; font-size: 12px; color: #6d766d; line-height: 1.5;">
                              If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.
                            </p>

                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER SECTION -->
                  <tr>
                    <td align="center" style="padding-top: 32px; font-size: 12px; color: #6d766d; line-height: 1.6;">
                      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Gada Pass. All rights reserved.</p>
                      <p style="margin: 0 0 16px 0;">Find your next experience or host your own on Gada.</p>
                      
                      <!-- FOOTER LINKS -->
                      <p style="margin: 0;">
                        <a href="#" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                        <a href="https://pass.gada.africa/privacy" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Privacy Policy</a> &bull;
                        <a href="https://pass.gada.africa/terms" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Terms of Use</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `,
    };

    return this.sendBrevoEmail(payload);
  }

  async sendWelcomeEmail({
    email,
    firstName,
  }: SendWelcomeEmailPayload): Promise<any> {
    const recipientFirstName = firstName ? firstName.trim() : 'Creator';

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [
        {
          email,
          name: recipientFirstName,
        },
      ],
      subject: 'Welcome to Gada Pass!',
      htmlContent: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Gada Pass!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f2; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 560px;">
                
                <!-- HEADER -->
                ${this.getEmailHeaderHtml()}

                <!-- MAIN CONTENT CARD -->
                <tr>
                  <td>
                    <table role="presentation" width="100%" style="background-color: #ffffff; border: 1px solid #dce1d5; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                      <tr>
                        <td>
                          <!-- TAG BADGE -->
                          <h4 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 600; letter-spacing: -0.04em; color: #17211b;">
                            Hi ${recipientFirstName}<span style="color: #ff5757;">,</span>
                          </h4>

                          <p style="margin: 0 0 16px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                            Welcome 🥳  to a community of creative minds, making moments worth remembering.
                          </p>

                          <p style="margin: 0 0 28px 0; font-size: 14px; color: #6d766d; line-height: 1.6;">
                            Gada Pass is your all-in-one platform for effortlessly creating, promoting, and managing events and guest check-ins. Get started by creating your first event today and take the first step as an event host.
                          </p>

                          <!-- CALL TO ACTION BUTTON -->
                          <div style="text-align: left; margin: 32px 0;">
                            <a href="https://pass.gada.africa" target="_blank" style="background-color: #17211b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 9999px; font-weight: 800; font-size: 13px; display: inline-block; letter-spacing: -0.01em;">
                              Create Your First Event
                            </a>
                          </div>

                          <p style="margin: 0; font-size: 12px; color: #6d766d; word-break: break-all;">
                            Direct link: <a href="https://pass.gada.africa" style="color: #17211b; text-decoration: underline;">https://pass.gada.africa</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- FOOTER SECTION -->
                <tr>
                  <td align="center" style="padding-top: 32px; font-size: 12px; color: #6d766d; line-height: 1.6;">
                    <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Gada Pass. All rights reserved.</p>
                    <p style="margin: 0 0 16px 0;">Find your next experience or host your own on Gada.</p>
                    
                    <p style="margin: 0;">
                      <a href="#" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                      <a href="https://pass.gada.africa/privacy" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Privacy Policy</a> &bull;
                      <a href="https://pass.gada.africa/terms" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Terms of Use</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
    };

    return this.sendBrevoEmail(payload);
  }

  async sendEventPublished(data: SendEventPublishedPayload): Promise<any> {
    const organizerName = data.organizerName
      ? data.organizerName.trim()
      : 'Creator';

    const formattedDate = new Date(data.eventDate).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [
        {
          email: data.email,
          name: organizerName,
        },
      ],
      subject: `Your event "${data.eventName}" is now live! 🎉`,
      textContent: `
Hi ${organizerName},

Great news! Your event "${data.eventName}" has been successfully published and is now live on Gada Pass.

Event Details:
- Event: ${data.eventName}
- Date: ${formattedDate}
- Location: ${data.eventLocation}

You can view and share your event page here:
${data.eventUrl}

Start sharing your link to collect registrations and sell tickets!
      `.trim(),
      htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Published</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7f7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211b;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f2; padding: 32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px;">
                  
                  <!-- HEADER -->
                  ${this.getEmailHeaderHtml()}

                  <!-- MAIN CONTENT CARD -->
                  <tr>
                    <td>
                      <table role="presentation" width="100%" style="background-color: #ffffff; border: 1px solid #dce1d5; border-radius: 24px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
                        <tr>
                          <td>
                            <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #17211b;">
                              Hi ${organizerName},
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              Great news! Your event <strong>${data.eventName}</strong> has been successfully published and is now live on Gada Pass. 🚀
                            </p>

                            <!-- EVENT SUMMARY BOX -->
                            <div style="background-color: #f5f5f6; border: 1px solid #dce1d5; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                              <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #6d766d;">
                                Published Event Details
                              </p>
                              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 800; color: #17211b;">
                                ${data.eventName}
                              </p>
                              <p style="margin: 0 0 4px 0; font-size: 13px; color: #17211b;">
                                <strong>Date:</strong> ${formattedDate}
                              </p>
                              <p style="margin: 0; font-size: 13px; color: #17211b;">
                                <strong>Location:</strong> ${data.eventLocation}
                              </p>
                            </div>

                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6d766d; line-height: 1.5;">
                              You can now share your link with attendees to start driving ticket sales and managing check-ins.
                            </p>

                            <!-- CALL TO ACTION BUTTON -->
                            <div style="text-align: center; margin: 32px 0;">
                              <a href="${data.eventUrl}" target="_blank" style="background-color: #17211b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 14px; display: inline-block;">
                                View Live Event Page
                              </a>
                            </div>

                            <p style="margin: 0; font-size: 12px; color: #6d766d; text-align: center; word-break: break-all;">
                              Direct link: <a href="${data.eventUrl}" style="color: #17211b; text-decoration: underline;">${data.eventUrl}</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER SECTION -->
                  <tr>
                    <td align="center" style="padding-top: 32px; font-size: 12px; color: #6d766d; line-height: 1.6;">
                      <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Gada Pass. All rights reserved.</p>
                      <p style="margin: 0 0 16px 0;">Find your next experience or host your own on Gada.</p>
                      
                      <p style="margin: 0;">
                        <a href="#" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Unsubscribe</a> &bull;
                        <a href="https://pass.gada.africa/privacy" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Privacy Policy</a> &bull;
                        <a href="https://pass.gada.africa/terms" target="_blank" style="color: #6d766d; text-decoration: underline; margin: 0 8px;">Terms of Use</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
      `,
    };

    return this.sendBrevoEmail(payload);
  }
}
