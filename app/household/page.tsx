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
      <Link href="/dictionary" className={styles.shortcut}><span>⌘</span><span><strong>Cooking dictionary</strong><small>Plain-English kitchen terms</small></span><b>→</b></Link>
      <Link href="/account" className={styles.shortcut}><span>⌁</span><span><strong>Privacy & account</strong><small>Download or control your data</small></span><b>→</b></Link>
    </section>
    <section className={`card ${styles.sharedKitchen}`}><div><p className={styles.cardEyebrow}>Shared kitchen</p><h2>{members.length} {members.length === 1 ? "person cooks" : "people cook"} here</h2></div><p>Recipes and cookbooks can be shared with this kitchen. Your health, habits and personal check-ins stay visible only to you.</p></section>
    <section className={`card ${styles.members}`}><div><h2>People in this kitchen</h2><p className={styles.membersIntro}>Everyone below can see items you choose to share with this kitchen.</p></div><ul>{members.map((member) => { const isYou = member.user.email === identity.user.email; return <li key={member.id}><span className={styles.memberIdentity}><span className={styles.avatar} aria-hidden="true">{member.user.displayName.trim().slice(0, 1).toUpperCase()}</span><span>{member.user.displayName}{isYou && <small className={styles.you}>You</small>}</span></span><span className={styles.meta}>{member.role === "owner" ? "Owner" : "Member"} · {member.user.email}</span></li>; })}</ul></section>
    {identity.membership.role === "owner" && <InvitePanel />}
    {identity.membership.role === "owner" && <Link href="/admin" className="btn btn-secondary">Open admin portal</Link>}
    <SignOutButton />
  </div>;
}
