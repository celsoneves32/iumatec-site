/** @type {import('next-sitemap').IConfig} */

const siteUrl = process.env.SITE_URL || "https://www.iumatec.ch";

module.exports = {
  siteUrl,
  generateRobotsTxt: true,

  // Opcional: bom para lojas
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,

  // Rotas que não devem ir para o sitemap
  exclude: ["/api/*", "/admin/*"],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    additionalSitemaps: [
      `${siteUrl}/sitemap.xml`,
    ],
  },
};
