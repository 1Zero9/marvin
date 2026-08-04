"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import styles from "./AppShell.module.css";

const publicPaths = ["/setup", "/signin", "/join", "/share", "/recover", "/reset"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const showHomeFooter = pathname === "/cook";
  return <>
    {!isPublic && <Nav />}
    <main className={`${styles.main} ${isPublic ? styles.publicMain : ""} ${showHomeFooter ? styles.withMobileFooter : ""}`}>
      <div className={`container ${isPublic ? styles.publicContent : ""}`}>{children}</div>
    </main>
    {!isPublic && <div className="container"><Footer showOnMobile={showHomeFooter} /></div>}
  </>;
}
