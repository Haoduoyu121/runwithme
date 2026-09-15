/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ★ 静态导出（Cloudflare Workers 需要） */
  output: "export",

  /* ★ 静态导出时图片必须关闭优化 */
  images: { unoptimized: true },

  /* ★ Turbopack 空配置（Next.js 16 不再报 webpack 冲突） */
  turbopack: {},

  /* 你原有的配置 */
  reactStrictMode: true,
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,

  /* ★ 先禁用 PWA，避免和静态导出冲突 */
  disable: true,

  workboxOptions: {
    disableDevLogs: true,
  },
});

module.exports = withPWA(nextConfig);