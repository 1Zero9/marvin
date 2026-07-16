"use client";
import { useRouter } from "next/navigation";
import styles from "./SignOutButton.module.css";
export default function SignOutButton() { const router = useRouter(); return <button className={styles.button} onClick={async () => { await fetch("/api/auth/signout", { method: "POST" }); router.push("/signin"); router.refresh(); }}>Sign out</button>; }
