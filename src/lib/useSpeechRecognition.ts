'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = { lang?: string; continuous?: boolean; interimResults?: boolean };
type Handler = (text: string, isFinal: boolean) => void;

export type SpeechRecognitionError =
  | 'not-allowed' | 'service-not-allowed' | 'no-speech'
  | 'audio-capture' | 'network' | 'aborted' | 'language-not-supported' | 'unknown';

export type SpeechRecognitionState = {
  supported: boolean;
  listening: boolean;
  error: SpeechRecognitionError | null;
  start: () => void;
  stop: () => void;
  clearError: () => void;
};

const KNOWN_ERRORS: SpeechRecognitionError[] = [
  'not-allowed', 'service-not-allowed', 'no-speech',
  'audio-capture', 'network', 'aborted', 'language-not-supported',
];

export function useSpeechRecognition(
  onResult: Handler,
  options: Options = {},
): SpeechRecognitionState {
  const { lang = 'es-CO', continuous = true, interimResults = true } = options;

  const recRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const reportedFinalCountRef = useRef(0);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.onresult = null; recRef.current.onerror = null; recRef.current.onend = null; recRef.current.onstart = null; } catch {}
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('unknown'); return; }

    // Kill previous instance cleanly
    if (recRef.current) {
      try { recRef.current.onresult = null; recRef.current.onerror = null; recRef.current.onend = null; recRef.current.onstart = null; } catch {}
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }

    setError(null);
    reportedFinalCountRef.current = 0;

    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;

    rec.onstart = () => setListening(true);

    rec.onresult = (event: any) => {
      let interim = '';
      let newFinal = '';
      let finalCount = 0;
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalCount += 1;
          if (finalCount > reportedFinalCountRef.current) {
            newFinal += (newFinal ? ' ' : '') + t.trim();
          }
        } else {
          interim += (interim ? ' ' : '') + t.trim();
        }
      }
      reportedFinalCountRef.current = finalCount;
      if (newFinal) onResultRef.current(newFinal, true);
      onResultRef.current(interim, false);
    };

    rec.onerror = (event: any) => {
      const raw = event?.error as string | undefined;
      if (raw && raw !== 'aborted') {
        const code = (KNOWN_ERRORS as string[]).includes(raw)
          ? (raw as SpeechRecognitionError) : 'unknown';
        setError(code);
      }
      setListening(false);
    };

    rec.onend = () => setListening(false);

    // MUST call synchronously — Chrome requires user-gesture context.
    try {
      rec.start();
      recRef.current = rec;
    } catch {
      setError('not-allowed');
      setListening(false);
    }
  }, [lang, continuous, interimResults]);

  useEffect(() => () => {
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }
  }, []);

  return { supported, listening, error, start, stop, clearError };
}
