import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const apply = process.argv.includes("--apply");
const isPublicBlob = (url) => url.includes(".public.blob.vercel-storage.com/");
const extensionFor = (url) => new URL(url).pathname.match(/\.[a-z0-9]{2,6}$/i)?.[0] ?? ".bin";

if (apply && process.env.MARVIN_MEDIA_MIGRATION_APPROVED !== "1") {
  throw new Error("Set MARVIN_MEDIA_MIGRATION_APPROVED=1 to apply this migration.");
}
if (apply && !process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
  throw new Error("PRIVATE_BLOB_READ_WRITE_TOKEN is required to apply this migration.");
}

const prisma = new PrismaClient();

async function copy(url, pathname) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read ${url}: ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  return put(pathname, response.body, {
    access: "private",
    token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
    contentType,
  });
}

async function main() {
  const [photos, books] = await Promise.all([
    prisma.photo.findMany({ where: { url: { contains: ".public.blob.vercel-storage.com/" } }, select: { id: true, url: true } }),
    prisma.book.findMany({ where: { coverUrl: { contains: ".public.blob.vercel-storage.com/" } }, select: { id: true, coverUrl: true } }),
  ]);
  console.log(`${apply ? "Applying" : "Dry run"}: ${photos.length} photo(s), ${books.length} cover(s) eligible for private migration.`);
  if (!apply) {
    console.log("Re-run with --apply and MARVIN_MEDIA_MIGRATION_APPROVED=1 after the private-media code is deployed.");
    return;
  }

  for (const photo of photos) {
    if (!isPublicBlob(photo.url)) continue;
    const blob = await copy(photo.url, `migrated/photos/${photo.id}${extensionFor(photo.url)}`);
    await prisma.photo.update({ where: { id: photo.id }, data: { url: blob.url } });
    console.log(`Migrated photo ${photo.id}`);
  }
  for (const book of books) {
    if (!book.coverUrl || !isPublicBlob(book.coverUrl)) continue;
    const blob = await copy(book.coverUrl, `migrated/covers/${book.id}${extensionFor(book.coverUrl)}`);
    await prisma.book.update({ where: { id: book.id }, data: { coverUrl: blob.url } });
    console.log(`Migrated cover ${book.id}`);
  }
  console.log("Private migration complete. Public originals were deliberately retained.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
