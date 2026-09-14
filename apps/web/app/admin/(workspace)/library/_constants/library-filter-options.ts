import {
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  Tags
} from "lucide-react";
import type { DocumentMimeGroup } from "../_types/library.types";

export const libraryFilterSectionIcons = {
  category: Tags,
  type: FileType
};

export const documentTypeFilterOptions: Array<{
  icon: typeof FileText;
  label: string;
  value: DocumentMimeGroup;
}> = [
  { icon: FileText, label: "PDF", value: "pdf" },
  { icon: FileImage, label: "JPEG / PNG / WebP", value: "image" },
  { icon: FileText, label: "Word", value: "word" },
  { icon: FileSpreadsheet, label: "Excel", value: "excel" },
  { icon: Presentation, label: "PowerPoint", value: "powerpoint" }
];
