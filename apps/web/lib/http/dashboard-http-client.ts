import { ApiError } from "./api-error";

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

type DashboardHttpRequest = {
  body?: unknown;
  headers?: HeadersInit;
  method?: HttpMethod;
  params?: URLSearchParams | Record<string, unknown>;
  path: string;
};

export const dashboardHttpClient = {
  request<T>({
    body,
    headers,
    method = "GET",
    params,
    path
  }: DashboardHttpRequest): Promise<T> {
    return request<T>({ body, headers, method, params, path });
  }
};

async function request<T>({ body, headers, method, params, path }: Required<Pick<DashboardHttpRequest, "method" | "path">> & Omit<DashboardHttpRequest, "method" | "path">) {
  const response = await fetch(toDashboardApiUrl(path, params), {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    method
  });

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    throw toApiError(data, response.status);
  }

  return data as T;
}

function toDashboardApiUrl(path: string, params?: DashboardHttpRequest["params"]) {
  const query = toSearchParams(params).toString();
  return `/api${path.replace(/^\/api/, "")}${query ? `?${query}` : ""}`;
}

function toSearchParams(params?: DashboardHttpRequest["params"]) {
  if (params instanceof URLSearchParams) {
    return params;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      }
    } else if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiError(data: unknown, status: number) {
  if (isErrorBody(data)) {
    const message = Array.isArray(data.message)
      ? data.message[0]
      : data.message;

    return new ApiError(message || `TEMIS API request failed: ${status}`, status, data);
  }

  return new ApiError(`TEMIS API request failed: ${status}`, status, data);
}

function isErrorBody(value: unknown): value is { message?: string | string[] } {
  return Boolean(value && typeof value === "object" && "message" in value);
}
