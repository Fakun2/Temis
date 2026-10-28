export type NewsletterVideo = { provider: "youtube" | "vimeo"; videoId: string };

export function parseNewsletterVideoUrl(value: string): NewsletterVideo | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const youtubeId =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
          ? (url.searchParams.get("v") ??
            (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : ""))
          : null;
    if (youtubeId && /^[\w-]{11}$/.test(youtubeId))
      return { provider: "youtube", videoId: youtubeId };
    const vimeoId = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)
      ? url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1]
      : null;
    return vimeoId ? { provider: "vimeo", videoId: vimeoId } : null;
  } catch {
    return null;
  }
}
export function isSafeNewsletterHref(value: string) {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
