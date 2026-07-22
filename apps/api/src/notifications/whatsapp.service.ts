import { Injectable, Logger } from '@nestjs/common';

interface BookingWebhookPayload {
  event: 'booking.created' | 'booking.reminder';
  companyName: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  professionalName: string;
  startAt: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendBookingCreated(payload: Omit<BookingWebhookPayload, 'event'>) {
    return this.callWebhook(process.env.N8N_BOOKING_CREATED_WEBHOOK_URL, {
      event: 'booking.created',
      ...payload,
    });
  }

  async sendBookingReminder(payload: Omit<BookingWebhookPayload, 'event'>) {
    return this.callWebhook(process.env.N8N_BOOKING_REMINDER_WEBHOOK_URL, {
      event: 'booking.reminder',
      ...payload,
    });
  }

  private async callWebhook(url: string | undefined, payload: BookingWebhookPayload) {
    if (!url) {
      this.logger.warn(
        `Webhook n8n não configurado para "${payload.event}" — WhatsApp não enviado (no-op).`,
      );
      return { sent: false, reason: 'Webhook não configurado' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Webhook respondeu ${response.status}`);
      }
      return { sent: true };
    } catch (error) {
      this.logger.error('Falha ao chamar webhook n8n', error as Error);
      return { sent: false, reason: (error as Error).message };
    }
  }
}
