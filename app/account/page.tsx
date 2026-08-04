import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { AiProcessingControl, DailyCompanionControl, DeleteAccountControl, FoodPreferencesControl } from "@/components/AccountPrivacyControls";
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
      <details className={`card ${styles.section}`}>
        <summary><span><strong>Download my data</strong><small>Personal exports and a full kitchen backup</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}>
          <h2>Personal data</h2><p>Get a JSON copy of your health tracking, daily check-ins, reflections, personal meal plan, saved lighter versions, and your own cooking history. It does not include other household members&rsquo; private records.</p><a href="/api/account/export" className="btn btn-primary">Download my data</a>
          <div className={styles.subsection}><h2>Everything I can see</h2><p>Get a full JSON backup that also includes the household&rsquo;s shared recipes, books and cook logs you can see.</p><a href="/api/account/export/full" className="btn btn-secondary">Download everything</a></div>
        </div>
      </details>
      <details className={`card ${styles.section}`}>
        <summary><span><strong>Privacy choices</strong><small>Control optional AI processing</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}><p>Marvin has no advertising or behavioural tracking. You can opt out of optional AI processing at any time.</p><AiProcessingControl enabled={identity.user.aiProcessingEnabled} /></div>
      </details>
      <details className={`card ${styles.section}`}>
        <summary><span><strong>Food preferences</strong><small>Hide ingredients you avoid</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}><p>These are personal to you. Marvin leaves matching meals out of your Library, searches, and suggestions without changing anyone else&rsquo;s kitchen.</p><FoodPreferencesControl exclusions={identity.user.foodExclusions} /></div>
      </details>
      <details className={`card ${styles.section}`}>
        <summary><span><strong>My Day</strong><small>Turn the private daily companion on or off</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}><p>My Day is your private companion for check-ins, habits, reflections, and patterns. Turning it off keeps Marvin focused on the shared kitchen; your private data stays safely stored.</p><DailyCompanionControl enabled={identity.user.showDailyCompanion} /></div>
      </details>
      <details className={`card ${styles.section}`}>
        <summary><span><strong>Sharing boundaries</strong><small>What can and cannot leave Marvin</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}><p>Health data cannot be shared. Recipe links are separate and revocable; they include the recipe only, never your personal history or household details.</p></div>
      </details>
      <details className={`card ${styles.section} ${styles.danger}`}>
        <summary><span><strong>Erase my data</strong><small>Permanently delete this account</small></span><b aria-hidden="true">+</b></summary>
        <div className={styles.sectionBody}><DeleteAccountControl /></div>
      </details>
    </div>
  );
}
