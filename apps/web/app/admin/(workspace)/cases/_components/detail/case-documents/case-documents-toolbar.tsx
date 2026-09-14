"use client";

import { FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { allCategoriesValue } from "../../../_constants/case-documents.constants";
import type { CaseDocumentsCategoryOption } from "../../../_types/case-document-uploads.types";

export function CaseDocumentsToolbar({
  categories,
  categoryFilter,
  isLoadingCategories,
  onCategoryFilterChange
}: {
  categories: CaseDocumentsCategoryOption[];
  categoryFilter: string;
  isLoadingCategories: boolean;
  onCategoryFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/30 pb-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Documentos
        </h2>
      </div>
      <Select
        value={categoryFilter}
        onValueChange={onCategoryFilterChange}
        disabled={isLoadingCategories || categories.length === 0}
      >
        <SelectTrigger className="h-9 w-full border-border/50 md:w-[220px]">
          <SelectValue placeholder="Filtrar categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allCategoriesValue}>Todas las categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
