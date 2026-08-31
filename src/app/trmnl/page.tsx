import TrmnlDashboard from "@/components/trmnl/TrmnlDashboard";
import { getTrmnlDashboardData } from "@/lib/trmnl-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TrmnlPage() {
  const dashboardData = await getTrmnlDashboardData();

  return <TrmnlDashboard data={dashboardData} />;
}
