import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import LogMealForm from "./LogMealForm";

export const dynamic = "force-dynamic";

export default async function AddLogPage() {
  const identity = await requireHousehold();
  const recipes = await prisma.recipe.findMany({
    where: { householdId: identity.membership.householdId, ...visibleTo(identity) },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
    take: 200,
  });
  return <LogMealForm recipes={recipes} />;
}
