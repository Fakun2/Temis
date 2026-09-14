"use client";

export function BoardMessage({ message, tone }: { message: string; tone?: "error" }) {
  return (
    <div
      className={`flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border/40 px-6 py-8 text-center text-sm ${
        tone === "error" ? "font-medium text-destructive" : "text-muted-foreground"
      }`}
    >
      {message}
    </div>
  );
}
