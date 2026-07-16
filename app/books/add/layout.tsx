import { requireHousehold } from "@/lib/auth";
export default async function AddBookLayout({ children }: { children: React.ReactNode }) { await requireHousehold(); return children; }
