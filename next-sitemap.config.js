/** @type {import('next-sitemap').IConfig} */
module.exports = {
  // URL base do teu site em produção
  siteUrl: "https://iumatec.ch",

  // Gera automaticamente /sitemap.xml e /robots.txt
  generateRobotsTxt: true,

  // Opcional: tamanho máximo de cada sitemap
  sitemapSize: 7000,

  // Valores genéricos de SEO
  changefreq: "daily",
  priority: 0.7,

  // Rotas que não devem aparecer no sitemap
  exclude: ["/api/*", "/_next/*"],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin"],
      },
    ],
  },
};
