export const onboardingLoadingCopy = {
  animatedWord: "espere",
  footerItems: ["Creando tenant...", "Asignando owner...", "Preparando workspace..."],
  subtitle: "Estamos configurando tu estudio juridico en Temis.",
  successTitle: "Estudio creado!",
  titlePrefix: "Creando estudio, "
} as const;

export const onboardingLoadingDurationMs = 2600;
export const onboardingLoadingExitMs = 720;
export const onboardingLoadingIntroMs = 1200;
export const onboardingLoadingOverlayStartDelayMs = 80;
export const onboardingLoadingSuccessMs = 1100;
export const onboardingLoadingTotalMs =
  onboardingLoadingOverlayStartDelayMs + onboardingLoadingIntroMs + onboardingLoadingDurationMs;
