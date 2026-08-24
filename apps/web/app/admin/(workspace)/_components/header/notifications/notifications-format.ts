export function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Buenos_Aires"
  }).format(new Date(value));
}
