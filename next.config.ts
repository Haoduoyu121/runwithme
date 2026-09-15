/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ★ 新增：Turbopack 空配置，让 Next.js 16 不再报错 */
  turbopack: {},

  /* 你原有的配置 */
  reactStrictMode: true,
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

module.exports = withPWA(nextConfig);