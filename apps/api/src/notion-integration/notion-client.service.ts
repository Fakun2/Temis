import { BadRequestException, Injectable } from "@nestjs/common";

const notionApiBaseUrl = "https://api.notion.com/v1";
const notionVersion = "2026-03-11";

@Injectable()
export class NotionClientService {
  private nextRequestAt = 0;

  async exchangeCode(input: { code: string; redirectUri: string }) {
    const clientId = getRequiredEnv("NOTION_CLIENT_ID");
    const clientSecret = getRequiredEnv("NOTION_CLIENT_SECRET");
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    return this.request<NotionTokenResponse>({
      body: {
        code: input.code,
        grant_type: "authorization_code",
        redirect_uri: input.redirectUri
      },
      headers: { Authorization: `Basic ${credentials}` },
      method: "POST",
      path: "/oauth/token",
      token: null
    });
  }

  async searchDataSources(input: {
    cursor?: string;
    pageSize: number;
    query?: string;
    token: string;
  }) {
    return this.request<NotionSearchResponse>({
      body: {
        ...(input.cursor ? { start_cursor: input.cursor } : {}),
        ...(input.query ? { query: input.query } : {}),
        filter: { property: "object", value: "data_source" },
        page_size: input.pageSize
      },
      method: "POST",
      path: "/search",
      token: input.token
    });
  }

  async queryDataSource(input: { cursor?: string; dataSourceId: string; token: string }) {
    return this.request<NotionQueryResponse>({
      body: {
        ...(input.cursor ? { start_cursor: input.cursor } : {}),
        page_size: 100,
        result_type: "page"
      },
      method: "POST",
      path: `/data_sources/${input.dataSourceId}/query`,
      token: input.token
    });
  }

  async retrieveDataSource(input: { dataSourceId: string; token: string }) {
    return this.request<NotionDataSource>({
      method: "GET",
      path: `/data_sources/${input.dataSourceId}`,
      token: input.token
    });
  }

  async retrievePage(input: { pageId: string; token: string }) {
    return this.request<NotionPage>({
      method: "GET",
      path: `/pages/${input.pageId}`,
      token: input.token
    });
  }

  async createPage(input: { dataSourceId: string; properties: Record<string, unknown>; token: string }) {
    return this.request<NotionPage>({
      body: {
        parent: { data_source_id: input.dataSourceId },
        properties: input.properties
      },
      method: "POST",
      path: "/pages",
      token: input.token
    });
  }

  async updatePage(input: { pageId: string; properties: Record<string, unknown>; token: string }) {
    return this.request<NotionPage>({
      body: { properties: input.properties },
      method: "PATCH",
      path: `/pages/${input.pageId}`,
      token: input.token
    });
  }

  private async request<T>({
    body,
    headers,
    method,
    path,
    token
  }: {
    body?: unknown;
    headers?: Record<string, string>;
    method: "GET" | "POST" | "PATCH";
    path: string;
    token: string | null;
  }): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await this.waitForSlot();
      const response = await fetch(`${notionApiBaseUrl}${path}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          "Content-Type": "application/json",
          "Notion-Version": notionVersion,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers
        },
        method
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (isRetryable(response.status, method) && attempt < 4) {
        await delay(getRetryDelayMs(response, attempt));
        continue;
      }

      const error = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
      throw new BadRequestException(
        sanitizeNotionError(error?.message ?? `Notion respondio con estado ${response.status}.`)
      );
    }

    throw new BadRequestException("No se pudo completar la solicitud a Notion.");
  }

  private async waitForSlot() {
    const now = Date.now();
    const waitMs = Math.max(0, this.nextRequestAt - now);
    this.nextRequestAt = Math.max(now, this.nextRequestAt) + 350;

    if (waitMs > 0) {
      await delay(waitMs);
    }
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new BadRequestException(`Falta configurar ${name} para Notion.`);
  }

  return value;
}

function isRetryable(status: number, method: string) {
  return status === 429 || status === 529 || (method === "GET" && [500, 502, 503, 504].includes(status));
}

function getRetryDelayMs(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  const baseSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : Math.min(2 ** attempt, 30);

  return baseSeconds * 1000 + Math.floor(Math.random() * 250);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeNotionError(message: string) {
  return message.replace(/secret_[A-Za-z0-9_-]+/g, "[token]").slice(0, 500);
}

export type NotionTokenResponse = {
  access_token: string;
  refresh_token?: string;
  bot_id?: string;
  workspace_icon?: string;
  workspace_id: string;
  workspace_name?: string;
};

export type NotionPage = {
  id: string;
  object: "page";
  archived?: boolean;
  in_trash?: boolean;
  last_edited_time?: string;
  properties: Record<string, NotionProperty>;
};

export type NotionProperty =
  | { type: "title"; title?: Array<{ plain_text?: string; text?: { content?: string } }> }
  | { type: "rich_text"; rich_text?: Array<{ plain_text?: string; text?: { content?: string } }> }
  | { type: "status"; status?: { name?: string } | null }
  | { type: "select"; select?: { name?: string } | null }
  | { type: "date"; date?: { start?: string | null } | null }
  | { type: "people"; people?: Array<{ id: string; name?: string; person?: { email?: string } }> }
  | { type: string; [key: string]: unknown };

export type NotionSearchResponse = {
  has_more: boolean;
  next_cursor: string | null;
  results: Array<{ id: string; object: string; title?: Array<{ plain_text?: string }> }>;
};

export type NotionQueryResponse = {
  has_more: boolean;
  next_cursor: string | null;
  results: NotionPage[];
};

export type NotionDataSource = {
  id: string;
  object: "data_source";
  properties: Record<
    string,
    {
      id: string;
      name?: string;
      type: string;
      select?: { options?: Array<{ name?: string }> };
      status?: { options?: Array<{ name?: string }> };
    }
  >;
};
