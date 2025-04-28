import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 개발 서버를 HTTPS로 실행하기 위한 설정
  devServer: {
    https: true
  }
};

export default nextConfig;
