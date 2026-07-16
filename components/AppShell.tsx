"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import styles from "./AppShell.module.css";

const publicPaths = ["/setup", "/signin", "/join"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return <><>{!isPublic && <Nav />}</><main className={`${styles.main} ${isPublic ? styles.publicMain : ""}`}>{children}</main>{!isPublic && <Footer />}</>;
}
