/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin ko server bundle mein external rakho (native deps)
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
