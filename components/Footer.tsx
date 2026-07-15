import Image from "next/image";
import pkg from "../package.json";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.version}>Marvin v{pkg.version}</span>
      <a
        href="https://1zero9.com"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.credit}
      >
        Built by
        <Image
          src="/1zero9.png"
          alt="1zero9"
          width={16}
          height={16}
          className={styles.logo}
        />
        1zero9
      </a>
    </footer>
  );
}
