import { requireHousehold } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InvitePanel from "@/components/InvitePanel";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import styles from "./household.module.css";

export default async function HouseholdPage() {
  const identity = await requireHousehold();
  const members = await prisma.membership.findMany({ where: { householdId: identity.membership.householdId }, include: { user: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } });
  return <div className={styles.wrap}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Your space</p>
      <h1 className={styles.title}>{identity.membership.household.name}</h1>
      <p className={styles.sub}>Your private habits, your shared kitchen, and the people you choose to cook with.</p>
    </header>
    <section className={styles.shortcuts} aria-label="Your space">
      <Link href="/health" className={styles.shortcut}><span>♥</span><span><strong>Private health</strong><small>Habits, check-ins & progress</small></span><b>→</b></Link>
      <Link href="/books" className={styles.shortcut}><span>▤</span><span><strong>Kitchen library</strong><small>Books and saved recipes</small></span><b>→</b></Link>
      <Link href="/moments" className={styles.shortcut}><span>◌</span><span><strong>Food memories</strong><small>Meals worth remembering</small></span><b>→</b></Link>
      <Link href="/account" className={styles.shortcut}><span>⌁</span><span><strong>Privacy & account</strong><small>Download or control your data</small></span><b>→</b></Link>
    </section>
    <section className={`card ${styles.members}`}><h2>People in this kitchen</h2><ul>{members.map((member) => <li key={member.id}><span>{member.user.displayName}</span><span className={styles.meta}>{member.role === "owner" ? "Owner" : "Member"} · {member.user.email}</span></li>)}</ul></section>
    {identity.membership.role === "owner" && <InvitePanel />}
    {identity.membership.role === "owner" && <Link href="/admin" className="btn btn-secondary">Open admin portal</Link>}
    <SignOutButton />
  </div>;
}
