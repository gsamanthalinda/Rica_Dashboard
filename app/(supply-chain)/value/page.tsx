"use client";

import { Suspense } from "react";
import ValueContent from "@/app/supply_chain_manager/value_caclulations/value_calculation";

export default function ValuePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ValueContent />
    </Suspense>
  );
}
