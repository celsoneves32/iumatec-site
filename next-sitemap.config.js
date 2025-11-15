/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://iumatec.ch",
  generateRobotsTxt: true,
  changefreq: "weekly",
  sitemapSize: 5000,
  exclude: ["/api/*"],
  transform: async (config, route) => {
    return {
      loc: route,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: new Date().toISOString(),
    };
  },
};
