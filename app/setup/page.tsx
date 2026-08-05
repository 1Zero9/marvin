import AuthForm from "@/components/AuthForm";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "@/components/AuthForm.module.css";
import AuthBrand from "@/components/AuthBrand";
import pkg from "../../package.json";

export default async function SetupPage() {
  const isAlreadySetUp = (await prisma.user.count()) > 0;

  if (isAlreadySetUp) {
    return <section className={`card ${styles.form}`}>
      <AuthBrand />
      <h1 className={styles.title}>Marvin is ready</h1>
      <p className={styles.sub}>Only the first person creates a kitchen. To add another household member, sign in as the kitchen owner and create an invitation from the Household page.</p>
      <Link href="/signin" className="btn btn-primary">Sign in to invite someone</Link>
      <p className={styles.switch}>Already have an invitation? Open its link while signed out, ideally on the new member&rsquo;s own device or in a private window.</p>
      <p className={styles.version}>Marvin v{pkg.version}</p>
    </section>;
  }

  return <AuthForm setup />;
}
