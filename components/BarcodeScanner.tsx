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
  const [status, setStatus] = useState<"starting" | "scanning" | "found">(
    "starting"
  );
  const [manual, setManual] = useState("");
  const detectedRef = useRef(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, 300);
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't access the camera. Type the ISBN below.");
        return;
      }
      try {
        await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current!,
          (result) => {
            if (cancelled || detectedRef.current) return;
            if (!result) return;
            const text = result.getText().replace(/[^0-9Xx]/g, "");
            const valid =
              text.length === 13
                ? text.startsWith("978") || text.startsWith("979")
                : text.length === 10;
            if (valid) {
              detectedRef.current = true;
              setStatus("found");
              reader.reset();
              onDetected(text);
            }
          }
        );
        if (!cancelled) setStatus("scanning");
      } catch (e) {
        if (cancelled) return;
        const err = e as DOMException;
        if (err?.name === "NotAllowedError") {
          setError(
            "Camera permission was denied. Allow camera access in your browser settings, or type the ISBN below."
          );
        } else if (err?.name === "NotFoundError") {
          setError("No camera found. Type the ISBN below.");
        } else {
          setError(
            `Camera couldn't start (${err?.name || "unknown"}). Type the ISBN below.`
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
          <span className={styles.status}>
            {status === "starting"
              ? "Starting camera…"
              : status === "found"
                ? "Barcode found!"
                : "Hold the barcode inside the frame"}
          </span>
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
