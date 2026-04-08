import DealServiceDashboard from "@/components/deal-service-dashboard";
import { listServiceMaps } from "@/lib/service-map-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const serviceMaps = await listServiceMaps();

  return <DealServiceDashboard initialServiceMaps={serviceMaps} />;
}
