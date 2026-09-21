/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ★ 静态导出 */
  output: "export",

  /* ★ 静态导出时图片必须关闭优化 */
  images: { unoptimized: true },

  /* ★ Turbopack 空配置 */
  turbopack: {},

  reactStrictMode: true,
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,

  disable: false,
  register: true,
  skipWaiting: true,

  workboxOptions: {
    disableDevLogs: true,
    /* ★ 新 SW 立即接管 */
    skipWaiting: true,
    clientsClaim: true,
    /* ★ 不缓存 sw.js 本身 */
    exclude: [/sw\.js$/],
  },
});

module.exports = withPWA(nextConfig);
