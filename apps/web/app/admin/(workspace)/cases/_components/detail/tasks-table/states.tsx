import { TableCell, TableRow } from "@/components/ui/table";
import { AdminTableRowsSkeleton } from "../../../../_components/admin-skeletons";

export function TaskRowsSkeleton({ columnCount }: { columnCount: number }) {
  return <AdminTableRowsSkeleton columnCount={columnCount} rowCount={8} />;
}

export function TaskTableMessageRow({
  className = "text-muted-foreground",
  columnCount,
  message
}: {
  className?: string;
  columnCount: number;
  message: string;
}) {
  return (
    <TableRow className="h-56 hover:bg-transparent">
      <TableCell className={`px-3 py-10 text-center text-sm ${className}`} colSpan={columnCount}>
        {message}
      </TableCell>
    </TableRow>
  );
}
