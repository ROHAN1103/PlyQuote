import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type EffectiveStatus } from "../types";

const VARIANT = { draft: "muted", finalized: "default", sent: "birch", accepted: "default", rejected: "warning", expired: "warning" } as const;

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
