/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://iumatec.ch",

  generateRobotsTxt: true,

  // evita incluir urls erradas
  exclude: [
    "/api/*",
    "/produkte*?*",        // remove páginas com parâmetros
    "/produkte?*",         // remove qualquer query
  ],

  transform: async (config, route) => {
    // ignorar completamente rotas com query string
    if (route.includes("?")) return null;

    return {
      loc: route,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: new Date().toISOString(),
    };
  },
};
