import { Suspense } from "react";
import { GroupsPage } from "@/components/groups-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GroupsPage />
    </Suspense>
  );
}
