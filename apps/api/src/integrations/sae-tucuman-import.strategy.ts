import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isIP } from "node:net";
import type {
  CourtImportCredentials,
  CourtImportStrategy,
  NormalizedCourtImportItem
} from "./court-import-strategy.types";
import type { SaeCaseStatus } from "./sae.schemas";

const saeTucumanSource = "sae";
const saeTucumanProvinceText = "Tucuman";
const defaultSaeUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36";
const privateIpv4Ranges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./
];

type SaeTucumanConfig = {
  loginUrl: string;
  proceedingsUrl: string;
  origin: string;
  userAgent: string;
};

@Injectable()
export class SaeTucumanImportStrategy implements CourtImportStrategy {
  readonly source = saeTucumanSource;

  async preview(input: CourtImportCredentials) {
    const payload = await this.fetchPayload(input);

    return normalizeSaePayload(payload);
  }

  private async fetchPayload(input: CourtImportCredentials) {
    let response: Response;

    try {
      const config = getSaeTucumanConfig();
      const accessToken = await fetchSaeAccessToken(input, config);
      response = await fetch(config.proceedingsUrl, toSaeFetchOptions(accessToken, config));
    } catch {
      throw new ServiceUnavailableException("No pudimos consultar SAE.");
    }

    if (!response.ok) {
      throw new ServiceUnavailableException("Credenciales SAE invalidas.");
    }

    try {
      return await response.json();
    } catch {
      throw new BadRequestException("SAE no devolvio un JSON valido.");
    }
  }
}

function getSaeTucumanConfig(): SaeTucumanConfig {
  const config = {
    loginUrl: readRequiredEnv("SAE_TUCUMAN_LOGIN_URL"),
    origin: readRequiredEnv("SAE_TUCUMAN_ORIGIN"),
    proceedingsUrl: readRequiredEnv("SAE_TUCUMAN_PROCEEDINGS_URL"),
    userAgent: readEnv("SAE_TUCUMAN_USER_AGENT", defaultSaeUserAgent)
  };

  assertSafeUrl(config.loginUrl, "La URL de login SAE configurada no es valida.");
  assertSafeUrl(config.proceedingsUrl, "La URL de expedientes SAE configurada no es valida.");
  assertSafeUrl(config.origin, "El origin SAE configurado no es valido.");

  return config;
}

function readEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ServiceUnavailableException("La integracion SAE no esta configurada.");
  }

  return value;
}

function toSaeFetchOptions(accessToken: string, config: SaeTucumanConfig): RequestInit {
  return {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      origin: config.origin,
      referer: `${config.origin}/`,
      "user-agent": config.userAgent
    },
    method: "GET",
    signal: AbortSignal.timeout(20_000)
  };
}

async function fetchSaeAccessToken(input: CourtImportCredentials, config: SaeTucumanConfig) {
  if (!input.username || !input.password) {
    throw new ServiceUnavailableException("Credenciales SAE invalidas.");
  }

  const loginPage = await fetch(config.loginUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": config.userAgent
    },
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(20_000)
  });
  const cookieJar = new Map<string, string>();
  mergeSetCookieHeaders(cookieJar, loginPage.headers);

  if (!loginPage.ok) {
    throw new ServiceUnavailableException("Credenciales SAE invalidas.");
  }

  const csrfToken = extractCsrfToken(await loginPage.text());

  if (!csrfToken) {
    throw new ServiceUnavailableException("Credenciales SAE invalidas.");
  }

  const loginResponse = await fetch(config.loginUrl, {
    body: new URLSearchParams({
      _token: csrfToken,
      password: input.password,
      username: input.username
    }),
    headers: {
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "content-type": "application/x-www-form-urlencoded",
      cookie: serializeCookieHeader(cookieJar),
      origin: originFromUrl(config.loginUrl),
      referer: config.loginUrl,
      "user-agent": config.userAgent
    },
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(20_000)
  });

  mergeSetCookieHeaders(cookieJar, loginResponse.headers);

  const token =
    getBearerTokenFromCookies(cookieJar) ??
    extractBearerToken(loginResponse.headers.get("location")) ??
    extractBearerToken(await safeReadText(loginResponse)) ??
    (await followSaeRedirects(config, loginResponse, cookieJar));

  if (!token) {
    throw new ServiceUnavailableException("Credenciales SAE invalidas.");
  }

  return token;
}

async function followSaeRedirects(
  config: SaeTucumanConfig,
  response: Response,
  cookieJar: Map<string, string>
) {
  let redirectLocation = response.headers.get("location");

  for (let index = 0; redirectLocation && index < 4; index += 1) {
    const nextUrl = new URL(redirectLocation, config.loginUrl).toString();
    const tokenFromUrl = extractBearerToken(nextUrl);

    if (tokenFromUrl) {
      return tokenFromUrl;
    }

    const redirectResponse = await fetch(nextUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        cookie: serializeCookieHeader(cookieJar),
        referer: config.loginUrl,
        "user-agent": config.userAgent
      },
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000)
    });

    mergeSetCookieHeaders(cookieJar, redirectResponse.headers);

    const token =
      getBearerTokenFromCookies(cookieJar) ?? extractBearerToken(await safeReadText(redirectResponse));

    if (token) {
      return token;
    }

    redirectLocation = redirectResponse.headers.get("location");
  }

  return null;
}

function normalizeSaePayload(payload: unknown): NormalizedCourtImportItem[] {
  const envelopes = Array.isArray(payload) ? payload : [payload];
  const items = envelopes.flatMap((envelope) => {
    const proceedingEnvelope = extractSaeProceedingEnvelope(envelope);

    if (proceedingEnvelope.proceedings.length > 0) {
      return proceedingEnvelope.proceedings
        .map((proceeding) =>
          normalizeSaeProceeding(envelope, proceedingEnvelope.user, proceeding)
        )
        .filter((item): item is NormalizedCourtImportItem => Boolean(item));
    }

    return normalizeSaeEnvelope(envelope);
  });
  const uniqueItems = new Map<string, NormalizedCourtImportItem>();

  for (const item of items) {
    if (!uniqueItems.has(item.externalId)) {
      uniqueItems.set(item.externalId, item);
    }
  }

  return [...uniqueItems.values()];
}

function extractSaeProceedingEnvelope(envelope: unknown) {
  if (!isRecord(envelope)) {
    return { proceedings: [], user: null };
  }

  const data = isRecord(envelope.data) ? envelope.data : null;
  const proceedings = Array.isArray(data?.proceedings)
    ? data.proceedings
    : Array.isArray(envelope.proceedings)
      ? envelope.proceedings
      : [];

  return {
    proceedings,
    user: isRecord(data?.user) ? data.user : null
  };
}

function normalizeSaeProceeding(
  envelope: unknown,
  user: Record<string, unknown> | null,
  proceeding: unknown
): NormalizedCourtImportItem | null {
  if (!isRecord(proceeding)) {
    return null;
  }

  const caseNumber = readString(proceeding.number);
  const externalId = readString(proceeding.procid) ?? readString(proceeding.id) ?? caseNumber;

  if (!caseNumber || !externalId) {
    return null;
  }

  const caption = readString(proceeding.cover) ?? `Expediente SAE ${caseNumber}`;
  const jurisdictionText = readString(proceeding.jurisdiction);
  const unitText = readString(proceeding.unit);
  const warnings = [];

  if (!readString(proceeding.cover)) {
    warnings.push("SAE no informo caratula; se usara una caratula provisional.");
  }

  if (!jurisdictionText) {
    warnings.push("SAE no informo jurisdiccion/fuero.");
  }

  if (!unitText) {
    warnings.push("SAE no informo unidad u oficina judicial.");
  }

  return {
    action: "create",
    caption,
    caseNumber,
    court: unitText ?? null,
    description: buildProceedingDescription(proceeding),
    externalId,
    jurisdictionText: jurisdictionText ?? null,
    provinceText: saeTucumanProvinceText,
    rawPayload: {
      envelope: toInputJson(envelope),
      proceeding: toInputJson(proceeding),
      user: user ? toInputJson(user) : null
    },
    source: saeTucumanSource,
    suggestedStatus: "open",
    unitText: unitText ?? null,
    warnings
  };
}

function normalizeSaeEnvelope(envelope: unknown): NormalizedCourtImportItem[] {
  if (!isRecord(envelope)) {
    return [];
  }

  const records = Array.isArray(envelope.records) ? envelope.records : [];

  return records
    .map((record) => normalizeSaeRecord(envelope, record))
    .filter((item): item is NormalizedCourtImportItem => Boolean(item));
}

function normalizeSaeRecord(
  envelope: Record<string, unknown>,
  record: unknown
): NormalizedCourtImportItem | null {
  if (!isRecord(record)) {
    return null;
  }

  const caseNumber = readString(record.number);
  const recordId = readString(record.id) ?? caseNumber;

  if (!caseNumber || !recordId) {
    return null;
  }

  const jurisdictionText = readString(envelope.jurisdiction);
  const unitText = readString(envelope.unit);
  const answer = readString(record.answer);
  const warnings = ["SAE no informo caratula; se usara una caratula provisional."];

  if (!jurisdictionText) {
    warnings.push("SAE no informo jurisdiccion/fuero.");
  }

  if (!unitText) {
    warnings.push("SAE no informo unidad u oficina judicial.");
  }

  return {
    action: "create",
    caption: `Expediente SAE ${caseNumber}`,
    caseNumber,
    court: unitText ?? null,
    description: buildRecordDescription(record),
    externalId: recordId,
    jurisdictionText: jurisdictionText ?? null,
    provinceText: saeTucumanProvinceText,
    rawPayload: {
      envelopeId: readString(envelope.id),
      record: toInputJson(record),
      sourceDate: readString(envelope.date) ?? null,
      state: isRecord(envelope.state) ? toInputJson(envelope.state) : null,
      unit: unitText ?? null,
      user: {
        cuit: readString(envelope.cuit),
        email: readString(envelope.email),
        lastname: readString(envelope.lastname),
        name: readString(envelope.name),
        phone: readString(envelope.phone),
        type: readString(envelope.type)
      }
    },
    source: saeTucumanSource,
    suggestedStatus: getSuggestedStatus(envelope, answer),
    unitText: unitText ?? null,
    warnings
  };
}

function buildProceedingDescription(proceeding: Record<string, unknown>) {
  const parts = ["Importado desde SAE Tucuman."];
  const procid = readString(proceeding.procid);
  const proceedingId = readString(proceeding.id);
  const jurisdiction = readString(proceeding.jurisdiction);
  const unit = readString(proceeding.unit);

  if (procid || proceedingId) {
    parts.push(`Identificador SAE: ${procid ?? proceedingId}`);
  }

  parts.push(`Provincia: ${saeTucumanProvinceText}`);

  if (jurisdiction) {
    parts.push(`Fuero/Jurisdiccion SAE: ${jurisdiction}`);
  }

  if (unit) {
    parts.push(`Unidad SAE: ${unit}`);
  }

  return parts.join("\n\n");
}

function buildRecordDescription(record: Record<string, unknown>) {
  const reason = readString(record.reason);
  const answer = readString(record.answer);
  const parts = ["Importado desde SAE Tucuman.", `Provincia: ${saeTucumanProvinceText}`];

  if (reason) {
    parts.push(`Consulta: ${reason}`);
  }

  if (answer) {
    parts.push(`Respuesta: ${answer}`);
  }

  return parts.join("\n\n");
}

function getSuggestedStatus(envelope: Record<string, unknown>, answer?: string): SaeCaseStatus {
  const state = isRecord(envelope.state) ? readString(envelope.state.name)?.toLowerCase() : null;
  const normalizedAnswer = answer?.toLowerCase() ?? "";

  if (normalizedAnswer.includes("paralizado")) {
    return "paused";
  }

  if (state === "finalizada" || state === "finalizado") {
    return "closed";
  }

  return "open";
}

function assertSafeUrl(value: string, message: string) {
  const url = new URL(value);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new BadRequestException(message);
  }

  if (process.env.NODE_ENV === "development") {
    return;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new BadRequestException(message);
  }

  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new BadRequestException(message);
  }
}

function isPrivateIp(hostname: string) {
  if (hostname === "::1") {
    return true;
  }

  return privateIpv4Ranges.some((range) => range.test(hostname));
}

function extractCsrfToken(html: string) {
  return (
    readRegexGroup(html, /name=["']_token["'][^>]*value=["']([^"']+)["']/i) ??
    readRegexGroup(html, /value=["']([^"']+)["'][^>]*name=["']_token["']/i) ??
    readRegexGroup(html, /<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i)
  );
}

function getBearerTokenFromCookies(cookieJar: Map<string, string>) {
  return (
    normalizeBearerToken(cookieJar.get("saeToken")) ??
    normalizeBearerToken(cookieJar.get("token")) ??
    normalizeBearerToken(cookieJar.get("access_token"))
  );
}

function mergeSetCookieHeaders(cookieJar: Map<string, string>, headers: Headers) {
  for (const header of getSetCookieHeaders(headers)) {
    const separatorIndex = header.indexOf(";");
    const cookie = separatorIndex >= 0 ? header.slice(0, separatorIndex) : header;
    const equalsIndex = cookie.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const name = cookie.slice(0, equalsIndex).trim();
    const value = cookie.slice(equalsIndex + 1).trim();

    if (name && value) {
      cookieJar.set(name, value);
    }
  }
}

function getSetCookieHeaders(headers: Headers) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookieHeaders = getSetCookie?.call(headers);

  if (setCookieHeaders?.length) {
    return setCookieHeaders;
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? splitSetCookieHeader(setCookie) : [];
}

function splitSetCookieHeader(header: string) {
  return header.split(/,(?=\s*[^;,=\s]+=)/);
}

function serializeCookieHeader(cookieJar: Map<string, string>) {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function extractBearerToken(value: string | null) {
  if (!value) {
    return null;
  }

  return readRegexGroup(value, /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
}

function normalizeBearerToken(value: string | undefined) {
  if (!value) {
    return null;
  }

  const decodedValue = decodeURIComponent(value).replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "");

  return extractBearerToken(decodedValue) ?? decodedValue;
}

function readRegexGroup(value: string, pattern: RegExp) {
  const match = pattern.exec(value);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function originFromUrl(value: string) {
  const url = new URL(value);

  return `${url.protocol}//${url.host}`;
}

function readString(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
