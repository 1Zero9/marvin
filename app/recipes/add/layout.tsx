import { requireHousehold } from "@/lib/auth";
export default async function AddRecipeLayout({ children }: { children: React.ReactNode }) { await requireHousehold(); return children; }
