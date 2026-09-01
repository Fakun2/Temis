import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountLoadError({ message }: { message?: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-foreground">No se pudo cargar la cuenta.</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-2 pb-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60 bg-card">
            <CardContent className="grid gap-4 p-5">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
