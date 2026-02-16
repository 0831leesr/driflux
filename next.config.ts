/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "shared-comic.pstatic.net", pathname: "/**" },
      { protocol: "https", hostname: "livecloud-thumb.akamaized.net", pathname: "/**" },
      { protocol: "https", hostname: "image.chzzk.naver.com", pathname: "/**" },
      { protocol: "https", hostname: "via.placeholder.com", pathname: "/**" },
      { protocol: "https", hostname: "images.igdb.com", pathname: "/igdb/**" },
    ],
  },
};

export default nextConfig;