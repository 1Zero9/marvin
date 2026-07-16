"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

const links = [
  { href: "/", label: "Search", icon: "⌕" },
  { href: "/books", label: "Books", icon: "▤" },
  { href: "/recipes", label: "Recipes", icon: "◉" },
  { href: "/decide", label: "Tonight", icon: "✦" },
  { href: "/log", label: "Log", icon: "◷" },
  { href: "/household", label: "Kitchen", icon: "⚙" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/icons/icon-192.png"
            alt="Marvin"
            width={44}
            height={44}
            className={styles.logo}
          />
          <span className={styles.name}>
            Marvin
            <span className={styles.tagline}>Starvin&rsquo;? Let&rsquo;s sort dinner.</span>
          </span>
        </Link>
        <nav className={styles.nav}>
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
              >
                <span className={styles.icon} aria-hidden="true">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
