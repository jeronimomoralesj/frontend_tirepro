'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = { lang?: string; rate?: number; pitch?: number };

export type SpeechSynthesisState = {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
};

export function useSpeechSynthesis(options: Options = {}): SpeechSynthesisState {
  const { lang = 'es-CO', rate = 0.95, pitch = 1.05 } = options;
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const refresh = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => { window.speechSynthesis.onvoiceschanged = null; window.speechSynthesis.cancel(); };
  }, []);

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const list = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
    if (!list.length) return undefined;

    const knownFemale = /monica|m[oó]nica|paulina|sabina|conchita|laura|sofia|valent[ií]na|esperanza|lupe|helena|in[eé]s|catalina|elena|marisol|isabel|ximena|ana\b|female|mujer|alva/i;
    const knownMale = /jorge|diego|carlos|miguel|raul|enrique|pablo|male\b|hombre/i;

    const score = (v: SpeechSynthesisVoice) => {
      let s = 0;
      const name = (v.name || '').toLowerCase();
      const vl = (v.lang || '').toLowerCase();
      if (vl === lang.toLowerCase()) s += 200;
      else if (vl.startsWith('es-co')) s += 180;
      else if (vl.startsWith('es-mx') || vl.startsWith('es-us')) s += 140;
      else if (vl.startsWith('es')) s += 100;
      else s -= 60;
      if (/natural|neural|enhanced|premium|wavenet|studio|online/.test(name)) s += 80;
      if (/google/.test(name)) s += 50;
      if (/microsoft/.test(name)) s += 35;
      if ((v as any).localService) s += 10;
      if (knownFemale.test(name)) s += 40;
      else if (knownMale.test(name)) s -= 10;
      return s;
    };

    return [...list].sort((a, b) => score(b) - score(a))[0];
  };

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    const v = pickVoice();
    if (v) utter.voice = v;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [lang, rate, pitch]);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, stop };
}
