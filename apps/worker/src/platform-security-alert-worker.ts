import { Resend } from "resend";
import { createLogger } from "./logger";
import type { PlatformSecurityAlertMessage } from "./queue/types";

export class PlatformSecurityAlertWorker {
  private readonly logger = createLogger("PlatformSecurityAlertWorker");

  async process(payload: PlatformSecurityAlertMessage) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    const to = process.env.PLATFORM_SECURITY_ALERT_EMAIL;
    if (!apiKey || !from || !to) {
      throw new Error("Platform security alert email is not configured.");
    }
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: [to],
      subject: `Alerta de seguridad Temis: ${payload.eventType}`,
      text: [
        `Evento: ${payload.eventType}`,
        `Resultado: ${payload.outcome}`,
        `Motivo: ${payload.reason ?? "sin detalle"}`,
        `Fecha: ${payload.occurredAt}`,
        `ID de auditoria: ${payload.eventId}`
      ].join("\n")
    });
    if (error) throw new Error("Security alert email delivery failed.");
    this.logger.info(`Security alert ${payload.eventId} delivered.`);
  }
}
