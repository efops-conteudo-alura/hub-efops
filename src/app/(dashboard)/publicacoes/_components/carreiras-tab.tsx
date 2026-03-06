"use client";

import { CarreirasPanel } from "@/app/(dashboard)/kpis/_components/carreiras-panel";
import type { CarreiraLevel } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

export function CarreirasTab({ initialLevels }: { initialLevels: CarreiraLevel[] }) {
  return <CarreirasPanel initialLevels={initialLevels} />;
}
