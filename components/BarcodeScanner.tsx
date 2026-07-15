"use client";

import { useEffect, useRef, useState } from "react";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  BinaryBitmap,
  HybridBinarizer,
  HTMLCanvasElementLuminanceSource,
} from "@zxing/library";
import styles from "./BarcodeScanner.module.css";

function isValidIsbn(text: string): boolean {
  return text.length === 13
    ? text.startsWith("978") || text.startsWith("979")
    : text.length === 10;
}

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

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new MultiFormatReader();
    reader.setHints(hints);

    const canvas = document.createElement("canvas");
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let detected = false;
    let tick = 0;

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    function tryDecode(video: HTMLVideoElement) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      tick++;
      const full = tick % 3 === 0;
      const sx = full ? 0 : Math.round(vw * 0.1);
      const sy = full ? 0 : Math.round(vh * 0.3);
      const sw = full ? vw : Math.round(vw * 0.8);
      const sh = full ? vh : Math.round(vh * 0.4);

      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

      try {
        const source = new HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new BinaryBitmap(new HybridBinarizer(source));
        const result = reader.decode(bitmap);
        const text = result.getText().replace(/[^0-9Xx]/g, "");
        if (isValidIsbn(text) && !detected) {
          detected = true;
          setStatus("found");
          stop();
          onDetected(text);
        }
      } catch {
        // no barcode in this frame — keep scanning
      } finally {
        reader.reset();
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't access the camera. Type the ISBN below.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        const track = stream.getVideoTracks()[0];
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          });
        } catch {
          // focusMode unsupported — fine
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        timer = setInterval(() => tryDecode(video), 300);
      } catch (e) {
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

    return stop;
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
                : "Fill the frame with the barcode — about 15cm away"}
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
