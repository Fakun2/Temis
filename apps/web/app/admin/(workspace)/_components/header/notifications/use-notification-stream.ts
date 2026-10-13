"use client";

import { useEffect, useRef } from "react";
import { NOTIFICATION_STREAM_PATH } from "./notifications.constants";
import { parseNotificationStreamEvent, type NotificationStreamEvent } from "./notification-stream";

type UseNotificationStreamOptions = {
  enabled: boolean;
  onEvent: (event: NotificationStreamEvent) => void;
};

export function useNotificationStream({
  enabled,
  onEvent
}: UseNotificationStreamOptions) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const eventSource = new EventSource(NOTIFICATION_STREAM_PATH);
    const handleNotification = (event: Event) => {
      const data = parseNotificationStreamEvent((event as MessageEvent<string>).data);
      if (data) onEventRef.current(data);
    };

    eventSource.addEventListener("notification", handleNotification);
    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
    };
  }, [enabled]);
}
