export async function temisFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(toProxyApiPath(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  const text = await response.text();
  const dataResponse = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(getErrorMessage(dataResponse, response.status));
  }

  return {
    data: dataResponse,
    headers: response.headers,
    status: response.status
  } as T;
}

function toProxyApiPath(url: string) {
  return `/api${url.replace(/^\/api/, "")}`;
}

function getErrorMessage(data: unknown, status: number) {
  if (isErrorBody(data)) {
    if (Array.isArray(data.message)) {
      return data.message[0] ?? `TEMIS API request failed: ${status}`;
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  return `TEMIS API request failed: ${status}`;
}

function isErrorBody(value: unknown): value is { message?: string | string[] } {
  return Boolean(value && typeof value === "object" && "message" in value);
}
