"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";

interface SearchableTerm {
  slug: string;
  name: string;
  shortDef: string;
  synonyms: string[];
}

// Accent + case fold. "Índice" → "indice", "Reencauché" → "reencauche".
// Without this the search box only finds the precisely-accented form,
// but users on Spanish keyboards often skip accents entirely.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Iterative Levenshtein with a single-row buffer. We only call this on
// short strings (single words ≤ ~25 chars) so the O(n·m) cost is
// negligible inside the search loop.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  const curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    prev = curr.slice();
  }
  return prev[b.length];
}

// Per-token typo tolerance. Tokens of length ≤ 3 must match exactly
// (otherwise "psi" matches anything 1 edit away — too noisy). Tokens of
// length 4-6 tolerate 1 edit, longer tokens tolerate 2.
function fuzzyThreshold(needle: string): number {
  if (needle.length <= 3) return 0;
  if (needle.length <= 6) return 1;
  return 2;
}

// One token's contribution to the term's overall match score.
// 0 = no match, higher is better. Substring matches outrank fuzzy
// hits so "índice" beats "indici" when both are present.
function scoreToken(haystackWords: string[], needle: string): number {
  // Substring against any word in the haystack
  for (const w of haystackWords) {
    if (w.startsWith(needle)) return 3;
    if (w.includes(needle)) return 2;
  }
  // Levenshtein fallback for typos
  const threshold = fuzzyThreshold(needle);
  if (threshold === 0) return 0;
  for (const w of haystackWords) {
    if (Math.abs(w.length - needle.length) > threshold) continue;
    if (levenshtein(w, needle) <= threshold) return 1;
  }
  return 0;
}

// Client-only search island. The full index is server-rendered (so
// Googlebot sees every term as anchor text on first byte); this widget
// just lets users filter without a page reload.
export default function GlosarioSearch({ terms }: { terms: SearchableTerm[] }) {
  const [query, setQuery] = useState("");

  // Precompute the searchable haystack per term, normalized + tokenized
  // once across renders. Cheap, but avoids redoing it for each keystroke.
  const indexed = useMemo(
    () =>
      terms.map((t) => {
        const haystack = `${t.name} ${t.shortDef} ${t.synonyms.join(" ")}`;
        const words = normalize(haystack).split(/[^a-z0-9]+/).filter(Boolean);
        return { term: t, words };
      }),
    [terms],
  );

  const matches = useMemo(() => {
    const raw = query.trim();
    if (!raw) return [];
    const tokens = normalize(raw).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return indexed
      .map(({ term, words }) => {
        // Each token contributes its score; missing-token = 0 means the
        // term fails the conjunctive filter below.
        const tokenScores = tokens.map((tok) => scoreToken(words, tok));
        const allMatch = tokenScores.every((s) => s > 0);
        const totalScore = allMatch ? tokenScores.reduce((a, b) => a + b, 0) : 0;
        return { term, score: totalScore };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score || a.term.name.localeCompare(b.term.name))
      .slice(0, 10);
  }, [query, indexed]);

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Busca un término: "DOT", "índice de carga", "tubeless"...'
          aria-label="Buscar término del glosario"
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-[15px] text-[#0A183A] placeholder-gray-400 bg-white border border-[#1E76B6]/15 outline-none transition-all focus:border-[#1E76B6] focus:shadow-[0_0_0_4px_rgba(30,118,182,0.12)]"
        />
      </div>

      {/* Live results — only renders when there's a query, so the index
          below stays visible by default and crawlers see every term. */}
      {query.trim() && (
        <div className="absolute z-20 mt-2 left-0 right-0 max-h-[420px] overflow-y-auto rounded-2xl bg-white border border-[#0A183A]/8 shadow-[0_12px_36px_rgba(10,24,58,0.12)]">
          {matches.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">
              Sin coincidencias. Intenta con otra palabra.
            </p>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-gray-100">
              {matches.map(({ term: t }) => (
                <li key={t.slug}>
                  <Link
                    href={`/glosario/${t.slug}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[#F0F7FF] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0A183A] truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.shortDef}</p>
                    </div>
                    <ArrowUpRight
                      className="w-4 h-4 text-[#1E76B6] flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
