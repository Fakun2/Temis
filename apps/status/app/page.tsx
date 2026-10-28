import { CurrentStatusPage } from "@/components/status-page-shell";
import { getStatusSnapshot } from "@/lib/status-feed";

export const revalidate = 60;

export default async function Page() {
  return <CurrentStatusPage snapshot={await getStatusSnapshot()} />;
}
