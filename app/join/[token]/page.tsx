import JoinForm from "@/components/JoinForm";
import AuthBrand from "@/components/AuthBrand";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "@/components/AuthForm.module.css";
import pkg from "../../../package.json";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: { email: true, acceptedAt: true, expiresAt: true },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return (
      <section className={`card ${styles.form}`}>
        <AuthBrand />
        <h1 className={styles.title}>Invitation unavailable</h1>
        <p className={styles.sub}>This invitation is invalid, expired, or has already been used. Ask the kitchen owner for a fresh link.</p>
        <Link className="btn btn-primary" href="/signin">Back to sign in</Link>
        <p className={styles.version}>Marvin v{pkg.version}</p>
      </section>
    );
  }
  return <JoinForm token={token} invitedEmail={invite.email} />;
}
