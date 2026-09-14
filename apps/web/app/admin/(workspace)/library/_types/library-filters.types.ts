import type { DocumentMimeGroup } from "./library.types";

export type LibraryFilters = {
  categoryId: string;
  mimeGroups: DocumentMimeGroup[];
};
