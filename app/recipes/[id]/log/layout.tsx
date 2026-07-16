import { requireHousehold } from "@/lib/auth";
export default async function LogCookLayout({ children }: { children: React.ReactNode }) { await requireHousehold(); return children; }
