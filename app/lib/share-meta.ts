export const SITE_TITLE = "GRND Share Value";

export const SITE_DESCRIPTION =
  "What your GRND shares from the PurposeMed acquisition are worth today.";

/**
 * Open Graph and Twitter tags for link previews (Slack, iMessage, WhatsApp…). Crawlers have no
 * share-count cookie, so they're sent to /settings: both routes need these tags.
 *
 * @param origin the site's origin, from the request, so deploy previews point at their own image
 */
export function shareMeta(origin: string) {
  return [
    { name: "description", content: SITE_DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_TITLE },
    { property: "og:title", content: SITE_TITLE },
    { property: "og:description", content: SITE_DESCRIPTION },
    { property: "og:url", content: `${origin}/` },
    { property: "og:image", content: `${origin}/og.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "GRND in glowing neon over a synthwave grid" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
