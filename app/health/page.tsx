import Link from "next/link";
import { requireHousehold } from "@/lib/auth";
import { getHealthSummary } from "@/lib/healthSummary";
import Icon from "@/components/Icon";
import styles from "./health.module.css";

export const dynamic = "force-dynamic";

export default async function HealthHubPage() {
  const identity = await requireHousehold();
  const tiles = await getHealthSummary(identity.user.id);

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Private to you</p>
        <h1 className={styles.title}>Your health</h1>
        <p className={styles.sub}>A clear picture, built from honest moments. No guilt and no pressure to keep a perfect streak.</p>
      </header>
      <div className={styles.grid}>
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className={`card ${styles.tile}`}>
            <div className={styles.tileTop}>
              <Icon name={tile.icon} className={styles.icon} />
              <h2 className={styles.tileTitle}>{tile.title}</h2>
            </div>
            <p className={styles.tileDesc}>{tile.desc}</p>
            {tile.stat && <span className={styles.stat}>{tile.stat}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
