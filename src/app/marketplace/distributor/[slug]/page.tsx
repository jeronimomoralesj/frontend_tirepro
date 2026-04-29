// src/app/marketplace/distributor/[slug]/page.tsx — Server Component
//
// The slug-based route is the canonical public URL for distributor pages
// (/marketplace/distributor/merquellantas). When the param looks like a
// UUID we issue a server-side redirect to the slug URL so any old indexed
// /marketplace/distributor/<uuid> links transfer their authority to the
// new canonical and don't end up as duplicate-content penalties in Google.

import { redirect } from 'next/navigation'
import DistributorClient from './DistributorClient'

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'https://api.tirepro.com.co/api'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function fetchProfile(idOrSlug: string) {
  try {
    const res = await fetch(`${API_BASE}/marketplace/distributor/${idOrSlug}/profile`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function DistributorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (UUID_RE.test(slug)) {
    const profile = await fetchProfile(slug)
    if (profile?.slug && profile.slug !== slug) {
      // 308 — preserves SEO authority of the old UUID URL while telling
      // crawlers the slug URL is the canonical destination.
      redirect(`/marketplace/distributor/${profile.slug}`)
    }
  }

  return <DistributorClient />
}
