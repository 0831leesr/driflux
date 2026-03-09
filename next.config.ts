/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel 무료 플랜 Image Transformations 절약
    formats: ["image/webp"], // avif 제거 → 변환 조합 감소
    minimumCacheTTL: 2592000, // 30일 캐시 (변환 재요청 감소)
    remotePatterns: [
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "shared-comic.pstatic.net", pathname: "/**" },
      { protocol: "https", hostname: "nng-phinf.pstatic.net", pathname: "/**" },
      { protocol: "https", hostname: "video-phinf.pstatic.net", pathname: "/**" },
      { protocol: "https", hostname: "livecloud-thumb.akamaized.net", pathname: "/**" },
      { protocol: "https", hostname: "image.chzzk.naver.com", pathname: "/**" },
      { protocol: "https", hostname: "via.placeholder.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/**" },
    ],
  },
};

export default nextConfig;