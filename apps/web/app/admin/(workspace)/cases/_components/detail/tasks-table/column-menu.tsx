import { Columns3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AdminTableHeaderActionButton } from "../../../../_components/admin-table-header-action-button";
import { caseTasksTableColumnLabels } from "../../../_constants/cases.constants";
import type { CaseTasksTableColumn } from "../../../_types/cases.types";

export const allCaseTasksTableColumns = Object.keys(
  caseTasksTableColumnLabels
) as CaseTasksTableColumn[];

export function TaskColumnsMenu<TColumn extends string = CaseTasksTableColumn>({
  columns = allCaseTasksTableColumns as unknown as readonly TColumn[],
  labels = caseTasksTableColumnLabels as unknown as Record<TColumn, string>,
  onToggleColumn,
  visibleColumns
}: {
  columns?: readonly TColumn[];
  labels?: Record<TColumn, string>;
  onToggleColumn: (column: TColumn, checked: boolean) => void;
  visibleColumns: readonly TColumn[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AdminTableHeaderActionButton icon={Columns3} label="Columnas" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            checked={visibleColumns.includes(column)}
            key={column}
            onCheckedChange={(value) => onToggleColumn(column, Boolean(value))}
          >
            {labels[column]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
