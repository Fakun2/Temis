"use client";

import { Check, CircleCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNotificationDate } from "./notifications-format";
import type { VisibleNotificationToast } from "./notifications.types";

type NotificationToastStackProps = {
  notifications: VisibleNotificationToast[];
  onDismiss: (notificationId: string) => void;
  onExited: (notificationId: string) => void;
  onRead: (notificationId: string) => void;
};

export function NotificationToastStack({
  notifications,
  onDismiss,
  onExited,
  onRead
}: NotificationToastStackProps) {
  if (!notifications.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2.5 sm:bottom-6 sm:right-6">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
          onRead={() => onRead(notification.id)}
          onExited={() => onExited(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onDismiss,
  onRead,
  onExited
}: {
  notification: VisibleNotificationToast;
  onDismiss: () => void;
  onRead: () => void;
  onExited: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto w-full rounded-[14px] border border-white/10 bg-[#282828] px-4 py-3.5 text-[#f5f5f5] shadow-[0_24px_58px_-34px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.08)] ${
        notification.exiting ? "notification-toast-exit" : "notification-toast-enter"
      }`}
      onAnimationEnd={() => {
        if (notification.exiting) {
          onExited();
        }
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center text-emerald-400">
          <CircleCheck className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Sparkles
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
                strokeWidth={1.55}
                aria-hidden="true"
              />
              <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 tracking-normal text-white">
                {notification.title}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="-mr-2 -mt-1.5 size-6 shrink-0 rounded-full p-0 text-zinc-400 hover:bg-white/5 hover:text-white"
              onClick={onDismiss}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Cerrar notificacion</span>
            </Button>
          </div>
          {notification.body ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-300">
              {notification.body}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] leading-none text-zinc-500">
            {formatNotificationDate(notification.scheduledAt)}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold leading-none text-white transition-colors hover:text-emerald-300"
              onClick={onRead}
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              Marcar leida
            </button>
            <button
              type="button"
              className="text-xs font-semibold leading-none text-white transition-colors hover:text-zinc-300"
              onClick={onDismiss}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
