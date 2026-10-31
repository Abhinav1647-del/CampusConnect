export const seo = (title: string, description: string) => ({
  meta: [
    { title: `${title} — Campus Connect` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Campus Connect` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
