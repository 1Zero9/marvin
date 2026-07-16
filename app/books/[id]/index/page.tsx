import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireHousehold } from "@/lib/auth";
import { visibleTo } from "@/lib/privacy";
import IndexPhotosClient from "./IndexPhotosClient";

export const dynamic = "force-dynamic";

export default async function AddIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requireHousehold();
  const book = await prisma.book.findUnique({
    where: { id, householdId: identity.membership.householdId, ...visibleTo(identity) },
    include: { _count: { select: { indexEntries: true } } },
  });
  if (!book) notFound();

  return (
    <IndexPhotosClient
      bookId={book.id}
      title={book.title}
      existingCount={book._count.indexEntries}
    />
  );
}
