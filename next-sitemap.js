/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://iumatec.ch",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  exclude: [
    "/api/*",
    "/produkte*?*",  // remove qualquer coisa com query string
  ],

  transform: async (config, route) => {
    // Ignorar rotas com parâmetros (evita erros XML)
    if (route.includes("?")) return null;

    return {
      loc: route,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: new Date().toISOString(),
    };
  },
};
