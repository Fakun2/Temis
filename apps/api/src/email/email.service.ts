import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordRecoveryCode(input: { code: string; email: string; expiresInMinutes: number }) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM");

    if (!apiKey || !from) {
      throw new ServiceUnavailableException("El servicio de email no esta disponible.");
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [input.email],
      subject: "Codigo para restablecer tu contraseña de Temis",
      text: `Tu codigo de recuperacion es ${input.code}. Vence en ${input.expiresInMinutes} minutos. Si no solicitaste este cambio, podes ignorar este correo.`,
      html: `<p>Tu codigo de recuperacion es:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 0.18em">${input.code}</p><p>Vence en ${input.expiresInMinutes} minutos.</p><p>Si no solicitaste este cambio, podes ignorar este correo.</p>`
    });

    if (error) {
      throw new ServiceUnavailableException("No se pudo enviar el email de recuperacion.");
    }
  }

}
