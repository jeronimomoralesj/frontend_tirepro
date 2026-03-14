import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",

        allow: [
          "/",
          "/blog/",
          "/calculadora/",
          "/contact",
          "/equipo",
        ],

        disallow: [
          "/dashboard",
          "/dashboard/",
          "/verify",
          "/verify/",
          "/login",
          "/registeruser",
          "/delete",
          "/context",
          "/blog/admin",
        ],
      },
    ],

    sitemap: "https://www.tirepro.com.co/sitemap.xml",

    host: "https://www.tirepro.com.co",
  };
}