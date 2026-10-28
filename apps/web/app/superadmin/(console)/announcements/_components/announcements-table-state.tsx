export function AnnouncementsTableState({
  action,
  icon,
  message
}: {
  action?: React.ReactNode;
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-9 flex items-center justify-center bg-card/35 px-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-3 text-muted-foreground">
        {icon}
        <p className="text-sm">{message}</p>
        {action}
      </div>
    </div>
  );
}
