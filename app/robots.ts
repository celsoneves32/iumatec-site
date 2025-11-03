import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://iumatec.ch";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"], // evita páginas privadas
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
