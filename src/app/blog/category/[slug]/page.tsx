import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categorySlug, prettifyCategorySlug } from "../../_lib/category";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://www.tirepro.com.co";

export const revalidate = 3600; // 1 hour

// Categories aren't a fixed taxonomy — they live as a free-text field on
// every post. We materialize the hub list by derivation: pull every post,
// group by slug, and prerender one hub per slug.
type Post = {
  id: string | number;
  slug: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  coverImage?: string | null;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  published?: boolean;
};

async function fetchAllPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_URL}/blog`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function indexBySlug(posts: Post[]) {
  const out = new Map<string, { label: string; posts: Post[] }>();
  for (const p of posts) {
    if (p.published === false) continue;
    if (!p.slug) continue;
    const label = (p.category ?? "general").trim() || "general";
    const slug = categorySlug(label);
    const entry = out.get(slug);
    if (entry) entry.posts.push(p);
    else out.set(slug, { label, posts: [p] });
  }
  return out;
}

export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return Array.from(indexBySlug(posts).keys()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const posts = await fetchAllPosts();
  const entry = indexBySlug(posts).get(slug);
  const label = entry?.label ?? prettifyCategorySlug(slug);
  const count = entry?.posts.length ?? 0;

  const title = `${label} — Artículos de Llantas y Flotas en Colombia | TirePro Blog`;
  const description = count > 0
    ? `${count} artículo${count === 1 ? "" : "s"} sobre ${label.toLowerCase()} para flotas en Colombia: guías, casos prácticos y análisis del equipo de TirePro.`
    : `Guías y artículos sobre ${label.toLowerCase()} para gerentes de flota, transportadores y compradores de llantas en Colombia.`;

  const canonical = `${SITE}/blog/category/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "TirePro",
      locale: "es_CO",
      title,
      description,
      images: [{ url: `${SITE}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE}/og-image.png`],
    },
    robots: { index: true, follow: true },
  };
}

function safeDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop";

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await fetchAllPosts();
  const entry = indexBySlug(posts).get(slug);
  if (!entry) notFound();

  const sorted = [...entry.posts].sort(
    (a, b) =>
      safeDate(b.updatedAt || b.createdAt).getTime() -
      safeDate(a.updatedAt || a.createdAt).getTime(),
  );

  const canonical = `${SITE}/blog/category/${slug}`;

  // Blog (CollectionPage-style) + BreadcrumbList. Mirrors what /blog
  // already emits but scoped to this category so Google can attach
  // authority to the hub URL instead of just the root /blog.
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${canonical}#blog`,
    name: `${entry.label} — Blog TirePro`,
    url: canonical,
    inLanguage: "es-CO",
    description: `Artículos sobre ${entry.label.toLowerCase()} para flotas en Colombia.`,
    publisher: {
      "@type": "Organization",
      name: "TirePro",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo_full.png` },
    },
    blogPost: sorted.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.subtitle ?? undefined,
      url: `${SITE}/blog/${p.slug}`,
      datePublished: p.createdAt,
      dateModified: p.updatedAt ?? p.createdAt,
      image: p.coverImage ?? undefined,
      author: { "@type": "Organization", name: "TirePro" },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 2, name: entry.label, item: canonical },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <main className="bg-white">
        {/* Breadcrumb + header */}
        <section className="border-b border-gray-100 px-6 lg:px-8 py-10 lg:py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-4">
              <Link href="/blog" className="hover:text-[#0A183A]">Blog</Link>
              <span className="mx-2">/</span>
              <span className="text-[#0A183A] font-semibold">{entry.label}</span>
            </nav>
            <h1 className="text-3xl lg:text-4xl font-black text-[#0A183A] tracking-tight">
              {entry.label}
            </h1>
            <p className="mt-3 text-gray-600 max-w-2xl">
              {sorted.length} artículo{sorted.length === 1 ? "" : "s"} sobre{" "}
              <strong>{entry.label.toLowerCase()}</strong> publicado{sorted.length === 1 ? "" : "s"} por
              el equipo de TirePro para flotas, transportadores y compradores de llantas en Colombia.
            </p>
          </div>
        </section>

        {/* Posts list */}
        <section className="px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {sorted.map((p) => (
              <article
                key={p.id}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
              >
                <Link href={`/blog/${p.slug}`} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.coverImage ?? FALLBACK_COVER}
                    alt={p.title}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="p-5">
                    <h2 className="text-lg font-bold text-[#0A183A] leading-tight line-clamp-2">
                      {p.title}
                    </h2>
                    {p.subtitle && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{p.subtitle}</p>
                    )}
                    <p className="mt-4 text-xs text-[#1E76B6] font-semibold uppercase tracking-wide">
                      Leer artículo →
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {sorted.length === 0 && (
            <p className="max-w-4xl mx-auto text-center text-gray-500 py-12">
              Aún no hay artículos publicados en esta categoría.
            </p>
          )}
        </section>

        {/* Footer link strip — internal linking to sibling categories. The
            blog index can show all categories; this section ensures every
            hub also links laterally, so crawlers don't reach a dead end. */}
        <section className="bg-gray-50 border-t border-gray-100 px-6 lg:px-8 py-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-[#0A183A] mb-4">
              Explora otras categorías del blog
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(indexBySlug(posts).entries())
                .filter(([s]) => s !== slug)
                .map(([s, e]) => (
                  <Link
                    key={s}
                    href={`/blog/category/${s}`}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 text-[#0A183A] hover:bg-[#F0F7FF] hover:border-[#348CCB] transition-colors"
                  >
                    {e.label} <span className="text-gray-400">({e.posts.length})</span>
                  </Link>
                ))}
              <Link
                href="/blog"
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0A183A] text-white hover:bg-[#1E76B6] transition-colors"
              >
                Ver todo el blog →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
