"use client";

import { use } from "react";
import { PatientTransferWorkspace } from "@/components/community/transfer/PatientTransferWorkspace";

export default function PatientTransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PatientTransferWorkspace transferId={id} />;
}
