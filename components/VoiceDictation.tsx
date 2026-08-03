"use client";

import { useEffect, useState } from "react";
import styles from "./VoiceDictation.module.css";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export default function VoiceDictation({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setSupported(Boolean((window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition));
  }, []);

  if (!supported) return null;

  function dictate() {
    const browser = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-GB";
    recognition.onresult = (event) => onTranscript(Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim());
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return <button type="button" className={styles.button} onClick={listening ? undefined : dictate} disabled={listening} aria-label="Dictate into this field">{listening ? "Listening…" : "🎙 Dictate"}</button>;
}
