"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTenantOptions } from "../../announcements/_api/announcements.api";
import { message } from "../_lib/newsletter-builder-model";

export function useNewsletterTenants(enabled: boolean) {
  const [tenantSearch, setTenantSearch] = useState("");
  const query = useQuery({
    queryKey: ["platform", "newsletter-tenants", tenantSearch],
    queryFn: () => listTenantOptions({ search: tenantSearch || undefined }),
    enabled
  });
  return {
    tenantOptions: query.data?.items ?? [],
    tenantSearch,
    setTenantSearch,
    tenantError: enabled && query.error ? message(query.error) : null
  };
}
