/** @type {import('next').NextConfig} */
const nextConfig = {
  /* 保留你原有的配置 */
  reactStrictMode: true,
  // ...
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