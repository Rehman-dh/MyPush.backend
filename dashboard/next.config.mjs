/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for a minimal self-hosted Docker image (traces only the
  // deps actually used at runtime into .next/standalone). No effect on
  // Vercel — Vercel ignores this setting and always uses its own build output.
  output: "standalone",
  // firebase-admin ko server bundle mein external rakho (native deps)
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
