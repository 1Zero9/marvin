import { requireHousehold } from "@/lib/auth";
export default async function SnapLayout({ children }: { children: React.ReactNode }) { await requireHousehold(); return children; }
