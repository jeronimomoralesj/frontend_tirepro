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

// Client-only search island. The full index is server-rendered (so
// Googlebot sees every term as anchor text on first byte); this widget
// just lets users filter without a page reload.
export default function GlosarioSearch({ terms }: { terms: SearchableTerm[] }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return terms
      .map((t) => {
        const haystack = `${t.name} ${t.shortDef} ${t.synonyms.join(" ")}`.toLowerCase();
        const score = tokens.reduce(
          (acc, tok) => (haystack.includes(tok) ? acc + 1 : acc),
          0,
        );
        return { t, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
      .slice(0, 10);
  }, [query, terms]);

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
              {matches.map(({ t }) => (
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
