import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Ingresá un email válido.");

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");
const loginPasswordSchema = z
  .string()
  .min(1, "Ingresa tu contrasena.")
  .max(72, "La contrasena no puede superar 72 caracteres.");

export const createAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá tu nombre completo."),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(6).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  tenantId: z.string().uuid().optional()
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, "No se recibio el token de Google.")
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

const webAuthnResponseSchema = z.record(z.unknown());

export const platformLoginStartSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema
});

export const platformLoginFinishSchema = z.object({
  transactionId: z.string().uuid(),
  response: webAuthnResponseSchema
});

export const platformEnrollmentStartSchema = z.object({
  bootstrapToken: z.string().min(32).max(512),
  deviceName: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: loginPasswordSchema
});

export const platformEnrollmentCredentialSchema = z.object({
  authenticatorName: z.string().trim().min(2).max(100),
  response: webAuthnResponseSchema,
  transactionId: z.string().uuid()
});

export const platformStepUpFinishSchema = z.object({
  response: webAuthnResponseSchema,
  transactionId: z.string().uuid()
});

export const platformPasswordStepUpSchema = z.object({
  password: loginPasswordSchema
});

export const passwordRecoveryRequestSchema = z.object({
  email: emailSchema
});

export const passwordRecoveryConfirmSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Ingresá el código de 6 dígitos."),
  newPassword: passwordSchema
});

export class CreateAccountDto extends createZodDto(createAccountSchema) {
  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: "password123" })
  password!: string;

  @ApiProperty({ required: false, example: "+54 9 11 5555-5555" })
  phone?: string;
}

export class LoginDto extends createZodDto(loginSchema) {
  @ApiProperty({ example: "admin@temis.local" })
  email!: string;

  @ApiProperty({ minLength: 8, example: "password123" })
  password!: string;

  @ApiProperty({
    required: false,
    format: "uuid",
    example: "00000000-0000-0000-0000-000000000001"
  })
  tenantId?: string;
}

export class GoogleLoginDto extends createZodDto(googleLoginSchema) {
  @ApiProperty()
  idToken!: string;
}

export class AuthUserDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ required: false, nullable: true, example: "+54 9 11 5555-5555" })
  phone!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: "https://lh3.googleusercontent.com/a/..."
  })
  avatarUrl!: string | null;

  @ApiProperty({ example: "active" })
  status!: string;
}

export class CreateAccountResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {
  @ApiProperty()
  refreshToken!: string;
}

export class PlatformLoginStartDto extends createZodDto(platformLoginStartSchema) {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  password!: string;
}

export class PlatformLoginFinishDto extends createZodDto(platformLoginFinishSchema) {
  @ApiProperty({ format: "uuid" })
  transactionId!: string;

  @ApiProperty({ type: Object })
  response!: Record<string, unknown>;
}

export class PlatformEnrollmentStartDto extends createZodDto(platformEnrollmentStartSchema) {
  @ApiProperty()
  bootstrapToken!: string;

  @ApiProperty()
  deviceName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  password!: string;
}

export class PlatformEnrollmentCredentialDto extends createZodDto(
  platformEnrollmentCredentialSchema
) {
  @ApiProperty()
  authenticatorName!: string;

  @ApiProperty({ type: Object })
  response!: Record<string, unknown>;

  @ApiProperty({ format: "uuid" })
  transactionId!: string;
}

export class PlatformStepUpFinishDto extends createZodDto(platformStepUpFinishSchema) {
  @ApiProperty({ type: Object })
  response!: Record<string, unknown>;

  @ApiProperty({ format: "uuid" })
  transactionId!: string;
}

export class PlatformPasswordStepUpDto extends createZodDto(platformPasswordStepUpSchema) {
  @ApiProperty()
  password!: string;
}

export class PasswordRecoveryRequestDto extends createZodDto(passwordRecoveryRequestSchema) {
  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;
}

export class PasswordRecoveryConfirmDto extends createZodDto(passwordRecoveryConfirmSchema) {
  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ example: "123456", minLength: 6, maxLength: 6 })
  code!: string;

  @ApiProperty({ example: "password456", minLength: 8, maxLength: 72 })
  newPassword!: string;
}

export class PasswordRecoveryResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export class TokenPairDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: "Bearer" })
  tokenType!: "Bearer";
}

export class LoginResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: TokenPairDto })
  tokens!: TokenPairDto;
}

export class PlatformAccessGrantedDto extends LoginResponseDto {
  @ApiProperty({ enum: ["disabled"] })
  securityMode!: "disabled";

  @ApiProperty({ enum: ["access_granted"] })
  status!: "access_granted";
}

export class PlatformFidoRequiredDto {
  @ApiProperty({ type: Object })
  options!: Record<string, unknown>;

  @ApiProperty({ enum: ["required"] })
  securityMode!: "required";

  @ApiProperty({ enum: ["fido_required"] })
  status!: "fido_required";

  @ApiProperty({ format: "uuid" })
  transactionId!: string;
}

export class LogoutDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}
