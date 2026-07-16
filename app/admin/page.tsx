import { notFound } from "next/navigation";
import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import styles from "./admin.module.css";

export default async function AdminPage() {
  const identity = await requireHousehold();
  if (identity.membership.role !== "owner") notFound();
  const [members, bookCount, recipeCount] = await Promise.all([
    prisma.membership.findMany({ where: { householdId: identity.membership.householdId }, include: { user: { select: { displayName: true, email: true, createdAt: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.book.count({ where: { householdId: identity.membership.householdId } }),
    prisma.recipe.count({ where: { householdId: identity.membership.householdId } }),
  ]);
  return <div className={styles.wrap}>
    <div><p className={styles.eyebrow}>Owner controls</p><h1>Admin portal</h1><p className={styles.sub}>Manage who belongs to {identity.membership.household.name}, and understand how its data is protected.</p></div>
    <section className={`card ${styles.grid}`}><div><strong>{members.length}</strong><span>people</span></div><div><strong>{bookCount}</strong><span>books</span></div><div><strong>{recipeCount}</strong><span>recipes</span></div></section>
    <section className={`card ${styles.section}`}><h2>Privacy defaults</h2><p>New books and recipes are private to their creator unless they deliberately choose “Everyone in my kitchen.” Nothing is public on the internet today.</p><p>As owner, you can see household data to support the family kitchen. Public sharing will remain off until it has a separate, reviewed sharing experience.</p></section>
    <section className={`card ${styles.section}`}><div className={styles.sectionHead}><h2>Household members</h2><Link href="/household" className="btn btn-secondary">Manage invitations</Link></div><ul>{members.map((member) => <li key={member.id}><span>{member.user.displayName}</span><small>{member.role === "owner" ? "Owner" : "Member"} · {member.user.email}</small></li>)}</ul></section>
    <section className={`card ${styles.section}`}><h2>Your account</h2><p>Signed in as {identity.user.displayName}. Your password is stored only as a one-way salted hash. Sessions are HTTP-only and expire automatically.</p></section>
  </div>;
}
