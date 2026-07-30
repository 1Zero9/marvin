import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { AiProcessingControl, DailyCompanionControl, DeleteAccountControl, FoodPreferencesControl, RecoveryCodeControl } from "@/components/AccountPrivacyControls";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const identity = await requireHousehold();
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your account</p>
          <h1>Your data stays yours</h1>
          <p>Signed in as {identity.user.displayName}. Your health, daily check-ins, and reflections are private to your account.</p>
        </div>
        <Link href="/household" className={styles.back}>← More</Link>
      </header>
      <section className={`card ${styles.section}`}>
        <h2>Download your personal data</h2>
        <p>Get a JSON copy of your health tracking, daily check-ins, reflections, personal meal plan, saved lighter versions, and your own cooking history. It does not include other household members&rsquo; private records.</p>
        <a href="/api/account/export" className="btn btn-primary">Download my data</a>
      </section>
      <section className={`card ${styles.section}`}>
        <h2>Privacy choices</h2>
        <p>Marvin has no advertising or behavioural tracking. You can opt out of optional AI processing at any time.</p>
        <AiProcessingControl enabled={identity.user.aiProcessingEnabled} />
      </section>
      <section className={`card ${styles.section}`}>
        <h2>Food preferences</h2>
        <p>These are personal to you. Marvin uses them to leave unsuitable meals out of your suggestions and recipe searches; they do not change anyone else&rsquo;s kitchen.</p>
        <FoodPreferencesControl exclusions={identity.user.foodExclusions} />
      </section>
      <section className={`card ${styles.section}`}>
        <h2>My Day</h2>
        <p>My Day is your private companion for check-ins, habits, reflections, and patterns. Turn it off to keep Marvin focused on the shared kitchen; your private data stays safely stored.</p>
        <DailyCompanionControl enabled={identity.user.showDailyCompanion} />
      </section>
      <section className={`card ${styles.section}`}>
        <h2>Keep a way back in</h2>
        <RecoveryCodeControl />
      </section>
      <section className={`card ${styles.section}`}>
        <h2>Sharing boundaries</h2>
        <p>Health data cannot be shared. Recipe links are separate and revocable; they include the recipe only, never your personal history or household details.</p>
      </section>
      <section className={`card ${styles.section}`}>
        <h2>Erase my data</h2>
        <DeleteAccountControl />
      </section>
    </div>
  );
}
