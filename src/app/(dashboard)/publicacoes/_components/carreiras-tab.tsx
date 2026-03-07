"use client";

import { CarreirasPanel } from "@/app/(dashboard)/kpis/_components/carreiras-panel";
import type { CarreiraLevel, SyncResult } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

interface Props {
  initialLevels: CarreiraLevel[];
  onSynced?: (result: SyncResult) => void;
}

export function CarreirasTab({ initialLevels, onSynced }: Props) {
  return <CarreirasPanel initialLevels={initialLevels} onSynced={onSynced} />;
}
