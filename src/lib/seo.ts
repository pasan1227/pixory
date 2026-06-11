// Pure SEO helpers — canonical site URL plus JSON-LD builders. Server-side
// only consumers (metadata, sitemap, robots, structured-data scripts); no
// React, no side effects, fully unit-tested.

/** Canonical site origin without a trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    return "http://localhost:3000";
  }
  return raw.replace(/\/+$/, "");
}

/** schema.org FAQPage JSON-LD from question/answer pairs. */
export function faqJsonLd(
  items: ReadonlyArray<{ q: string; a: string }>,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/** schema.org Organization JSON-LD. */
export function organizationJsonLd(input: {
  name: string;
  url: string;
  logo: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logo,
  };
}
