import { dashboardHttpClient } from "@/lib/http";
import { endpoint, type Draft, type Newsletter, toIso } from "../_lib/newsletter-builder-model";

export type NewsletterFilter = "all" | "active" | "inactive" | "scheduled";
export type NewsletterListItem = Omit<Newsletter, "content" | "targets"> & { createdAt: string };
export type NewsletterPage = {
  items: NewsletterListItem[];
  nextCursor: string | null;
  metrics: { total: number; active: number; inactive: number; scheduled: number };
};

export function listNewsletters(cursor?: string, filter: NewsletterFilter = "all") {
  return dashboardHttpClient.request<NewsletterPage>({
    path: endpoint,
    params: { filter, ...(cursor ? { cursor } : {}) }
  });
}

export function getNewsletter(id: string) {
  return dashboardHttpClient.request<Newsletter>({ path: `${endpoint}/${id}` });
}

export function deleteNewsletter(id: string) {
  return dashboardHttpClient.request({ path: `${endpoint}/${id}`, method: "DELETE" });
}

export function createNewsletter() {
  return dashboardHttpClient.request<Newsletter>({ path: endpoint, method: "POST" });
}

export function saveNewsletter(id: string, draft: Draft) {
  return dashboardHttpClient.request<Newsletter>({
    path: `${endpoint}/${id}`,
    method: "PATCH",
    body: { ...draft, startsAt: toIso(draft.startsAt), endsAt: toIso(draft.endsAt) }
  });
}

export function newsletterAction(id: string, action: "publish" | "schedule" | "cancel") {
  return dashboardHttpClient.request({ path: `${endpoint}/${id}/${action}`, method: "POST" });
}

export async function uploadNewsletterAsset(id: string, file: File) {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`/api${endpoint}/${id}/assets`, { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "No se pudo subir el archivo.");
  return result as { id: string };
}

export function uploadNewsletterAssetWithProgress(
  id: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api${endpoint}/${id}/assets`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("No se pudo completar la carga. Reintentá."));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300 || !result.id)
          throw new Error(result.message || "No se pudo cargar el archivo.");
        resolve(result as { id: string });
      } catch (error) {
        reject(error);
      }
    };
    const form = new FormData();
    form.append("file", file);
    request.send(form);
  });
}
