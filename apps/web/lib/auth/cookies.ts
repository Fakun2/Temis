export const accessTokenCookieName = "bogaap.access_token";
export const refreshTokenCookieName = "bogaap.refresh_token";
export const sessionCookieName = "bogaap.session";
export const platformSessionCookieName =
  process.env.NODE_ENV === "production" ? "__Host-temis-platform" : "temis-platform-dev";

export const accessTokenMaxAgeSeconds = 60 * 15;
export const refreshTokenMaxAgeSeconds = 60 * 60 * 24 * 7;
export const sessionMaxAgeSeconds = refreshTokenMaxAgeSeconds;
export const platformSessionMaxAgeSeconds = 60 * 60 * 8;
