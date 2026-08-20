/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for a minimal self-hosted Docker image (traces only the
  // deps actually used at runtime into .next/standalone). No effect on
  // Vercel — Vercel ignores this setting and always uses its own build output.
  output: "standalone",
  // firebase-admin ko server bundle mein external rakho (native deps)
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
    // Don't reuse a cached RSC payload on soft navigation — data pages are
    // force-dynamic and device rows change out-of-band (SDK registration), so
    // the client Router Cache would otherwise show stale/empty data until a
    // hard refresh. dynamic: 0 makes every navigation refetch fresh.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
