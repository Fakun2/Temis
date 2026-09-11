export const createAccountLoadingCopy = {
  animatedWord: "espere",
  footerItems: ["Validando datos...", "Creando acceso seguro...", "Preparando inicio de sesiÃ³n..."],
  subtitle: "Estamos preparando tu acceso seguro a TEMIS.",
  successTitle: "Cuenta creada con exito!",
  titlePrefix: "Creando cuenta, "
} as const;

export const createAccountLoadingDurationMs = 3000;
export const createAccountLoadingExitMs = 720;
export const createAccountLoadingIntroMs = 1400;
export const createAccountLoadingOverlayStartDelayMs = 80;
export const createAccountLoadingSuccessMs = 1300;
export const createAccountLoadingTotalMs =
  createAccountLoadingOverlayStartDelayMs +
  createAccountLoadingIntroMs +
  createAccountLoadingDurationMs;
