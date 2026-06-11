import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { faqJsonLd, organizationJsonLd, siteUrl } from "@/lib/seo";

describe("siteUrl", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });

  it("returns the env value untouched when it has no trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pixela.lk";
    expect(siteUrl()).toBe("https://pixela.lk");
  });

  it("trims a trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pixela.lk/";
    expect(siteUrl()).toBe("https://pixela.lk");
  });

  it("trims multiple trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://pixela.lk///";
    expect(siteUrl()).toBe("https://pixela.lk");
  });

  it("falls back to localhost when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("falls back to localhost when the env var is an empty string", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("faqJsonLd", () => {
  it("builds an exact FAQPage shape for two items", () => {
    const result = faqJsonLd([
      { q: "How long does delivery take?", a: "4–6 working days." },
      { q: "Can I pay cash on delivery?", a: "Yes, in Colombo & suburbs." },
    ]);

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How long does delivery take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "4–6 working days.",
          },
        },
        {
          "@type": "Question",
          name: "Can I pay cash on delivery?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, in Colombo & suburbs.",
          },
        },
      ],
    });
  });

  it("returns an empty mainEntity for no items", () => {
    expect(faqJsonLd([])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [],
    });
  });
});

describe("organizationJsonLd", () => {
  it("builds an exact Organization shape", () => {
    const result = organizationJsonLd({
      name: "Pixela",
      url: "https://pixela.lk",
      logo: "https://pixela.lk/logo.png",
    });

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Pixela",
      url: "https://pixela.lk",
      logo: "https://pixela.lk/logo.png",
    });
  });
});
