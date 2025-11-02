/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://iumatec.ch",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,
  exclude: ["/404", "/500"],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
    ],
    additionalSitemaps: [
      "https://iumatec.ch/sitemap.xml",
    ],
  },
};
