export const loginLoadingCopy = {
  animatedWord: "espere",
  footerItems: ["Validando credenciales...", "Cargando permisos...", "Preparando workspace..."],
  subtitle: "Estamos verificando tu acceso seguro a Temis.",
  successTitle: "Acceso concedido!",
  titlePrefix: "Iniciando sesion, "
} as const;

export const loginLoadingDurationMs = 2600;
export const loginLoadingExitMs = 720;
export const loginLoadingIntroMs = 1200;
export const loginLoadingOverlayStartDelayMs = 80;
export const loginLoadingSuccessMs = 1100;
export const loginLoadingTotalMs =
  loginLoadingOverlayStartDelayMs + loginLoadingIntroMs + loginLoadingDurationMs;
