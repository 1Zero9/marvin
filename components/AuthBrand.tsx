import Image from "next/image";
import styles from "./AuthForm.module.css";

export default function AuthBrand() {
  return (
    <div className={styles.brand}>
      <Image src="/icons/icon-192.png" alt="" width={46} height={46} />
      <span>Marvin</span>
    </div>
  );
}
