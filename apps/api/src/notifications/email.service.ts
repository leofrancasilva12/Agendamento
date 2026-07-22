import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

interface BookingConfirmationEmail {
  to: string;
  companyName: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  startAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) {
      this.logger.warn('SMTP_HOST não configurado — e-mails serão apenas logados (no-op).');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return this.transporter;
  }

  async sendBookingConfirmation(data: BookingConfirmationEmail) {
    const transporter = this.getTransporter();
    const subject = `Agendamento confirmado — ${data.companyName}`;
    const text = [
      `Olá, ${data.clientName}!`,
      `Seu agendamento em ${data.companyName} foi confirmado.`,
      `Serviço: ${data.serviceName}`,
      `Profissional: ${data.professionalName}`,
      `Data/hora: ${data.startAt.toLocaleString('pt-BR')}`,
    ].join('\n');

    if (!transporter) {
      this.logger.log(`[email:no-op] Para: ${data.to} — ${subject}`);
      return { sent: false, reason: 'SMTP não configurado' };
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@agendamento.local',
        to: data.to,
        subject,
        text,
      });
      return { sent: true };
    } catch (error) {
      this.logger.error('Falha ao enviar e-mail', error as Error);
      return { sent: false, reason: (error as Error).message };
    }
  }
}
