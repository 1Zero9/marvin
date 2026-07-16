"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

type IconName = "home" | "books" | "cook" | "log" | "more";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/books", label: "Books", icon: "books" },
  { href: "/decide", label: "Cook", icon: "cook" },
  { href: "/log", label: "Log", icon: "log" },
  { href: "/household", label: "More", icon: "more" },
];

function TabIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-6h6v6" /></>,
    books: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19h16v3H6.5A2.5 2.5 0 0 1 4 19Z" /></>,
    cook: <><path d="M7 3v5a3 3 0 0 0 6 0V3" /><path d="M10 11v10" /><path d="M17 3v18" /><path d="M17 3c3 2 3 6 0 8" /></>,
    log: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M7 2v4M17 2v4M7 10h10M7 14h7" /></>,
    more: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>{paths[name]}</svg>;
}

function NavLinks({ linkClass, activeClass }: { linkClass: string; activeClass: string }) {
  const pathname = usePathname();
  return <>
    {links.map((link) => {
      const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
      return <Link key={link.href} href={link.href} className={`${linkClass} ${active ? activeClass : ""}`}>
        <TabIcon name={link.icon} /><span>{link.label}</span>
      </Link>;
    })}
  </>;
}

export default function Nav() {
  return <>
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Marvin home">
          <Image src="/icons/icon-192.png" alt="" width={42} height={42} className={styles.logo} />
          <span className={styles.name}>Marvin</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <NavLinks linkClass={styles.link} activeClass={styles.active} />
        </nav>
      </div>
    </header>
    <nav className={styles.dock} aria-label="Main navigation">
      <NavLinks linkClass={styles.dockLink} activeClass={styles.dockActive} />
    </nav>
  </>;
}
