"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "../../../_api/notifications.api";
import { HeaderActionButton } from "../header-action-button";
import { formatNotificationDate } from "./notifications-format";

type NotificationsPopoverProps = {
  isLoading: boolean;
  notifications: NotificationDto[];
  onRead: (notificationId: string) => void;
  unreadCount: number;
};

export function NotificationsPopover({
  isLoading,
  notifications,
  onRead,
  unreadCount
}: NotificationsPopoverProps) {
  const previousUnreadCountRef = useRef(unreadCount);
  const [hasIncomingNotification, setHasIncomingNotification] = useState(false);

  useEffect(() => {
    const previousUnreadCount = previousUnreadCountRef.current;
    previousUnreadCountRef.current = unreadCount;

    if (unreadCount <= previousUnreadCount) {
      return;
    }

    setHasIncomingNotification(true);
    const timeoutId = window.setTimeout(() => setHasIncomingNotification(false), 920);

    return () => window.clearTimeout(timeoutId);
  }, [unreadCount]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <HeaderActionButton
            label="Notificaciones"
            className={cn(
              "temis-notification-trigger relative grid size-8 place-items-center rounded-full border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] text-foreground backdrop-blur-xl hover:bg-[var(--dropdown-item-hover)]",
              hasIncomingNotification && "temis-notification-trigger-incoming"
            )}
          >
            <Bell
              className="temis-notification-bell h-4 w-4"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            {unreadCount > 0 ? (
              <span className="temis-notification-badge absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-semibold leading-none text-white ring-2 ring-[var(--admin-page-bg)]">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </HeaderActionButton>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] max-w-[calc(100vw-2rem)]">
        <div className="border-b border-border/40 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificaciones</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {unreadCount ? `${unreadCount} pendientes` : "No hay recordatorios pendientes"}
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <NotificationState label="Cargando recordatorios" />
          ) : notifications.length ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={() => onRead(notification.id)}
              />
            ))
          ) : (
            <NotificationState label="Estas al dia" />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
  onRead
}: {
  notification: NotificationDto;
  onRead: () => void;
}) {
  return (
    <div className="rounded-xl px-3 py-2.5 hover:bg-[var(--dropdown-item-hover)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
          {notification.body ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {notification.body}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatNotificationDate(notification.scheduledAt)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="size-7 shrink-0 rounded-full p-0"
          onClick={onRead}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Marcar como leida</span>
        </Button>
      </div>
    </div>
  );
}

function NotificationState({ label }: { label: string }) {
  return <div className="px-3 py-8 text-center text-sm text-muted-foreground">{label}</div>;
}
