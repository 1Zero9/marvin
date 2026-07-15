"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";
import styles from "./BarcodeScanner.module.css";

export default function BarcodeScanner({
  onDetected,
}: {
  onDetected: (isbn: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const detectedRef = useRef(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]);
    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;

    async function start() {
      try {
        await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            if (result && !detectedRef.current && !cancelled) {
              const text = result.getText().replace(/[^0-9Xx]/g, "");
              if (text.length === 13 || text.length === 10) {
                detectedRef.current = true;
                onDetected(text);
              }
            }
          }
        );
      } catch {
        if (!cancelled) {
          setError(
            "Camera unavailable. Check permissions, or type the ISBN below."
          );
        }
      }
    }
    start();

    return () => {
      cancelled = true;
      reader.reset();
    };
  }, [onDetected]);

  return (
    <div className={styles.wrap}>
      {!error && (
        <div className={styles.videoBox}>
          <video ref={videoRef} className={styles.video} muted playsInline />
          <div className={styles.reticle} />
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <form
        className={styles.manualForm}
        onSubmit={(e) => {
          e.preventDefault();
          const clean = manual.replace(/[^0-9Xx]/g, "");
          if (clean.length === 10 || clean.length === 13) onDetected(clean);
        }}
      >
        <input
          className="input"
          inputMode="numeric"
          placeholder="Or type the ISBN…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">
          Look up
        </button>
      </form>
    </div>
  );
}
