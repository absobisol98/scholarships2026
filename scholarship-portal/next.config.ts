import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundles the app + only the node_modules it actually needs into .next/standalone —
  // an ECS/Fargate container built from that output is a fraction of the size (and starts
  // faster) than one carrying the full node_modules tree, which matters directly for
  // autoscaling fast enough to meet a real gate-opening traffic spike.
  output: "standalone",
  // Drops the "X-Powered-By: Next.js" response header — no reason to hand a probing
  // attacker a free framework/version fingerprint.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking: nothing in this app is meant to be framed by another origin.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Force HTTPS on every future request, including subdomains, once a browser has
          // seen this once — irrelevant in local dev (plain http://localhost never sends
          // it since Next only applies response headers to actual responses it serves,
          // and no browser acts on an HSTS header received over http:// anyway).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Stops a browser from re-interpreting a response as a different MIME type than
          // the one declared (e.g. sniffing an uploaded file into an executable script).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak this app's full URLs (which can carry ids/tokens in the path) to a
          // third-party site's server logs when a link out of the app is followed.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  experimental: {
    // Server Actions cap request bodies at 1MB by default — too small for the
    // application form's "PDF or image, up to 10MB" certificate upload plus the rest of
    // that step's fields in the same submission. 15mb leaves headroom without opening
    // Server Actions up to arbitrarily large payloads.
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // src/proxy.ts (this app's session/role guard) runs in front of every request,
    // including this one — and separately caps request bodies at 10MB by default
    // (proxyClientMaxBodySize), independent of the serverActions limit above. Without
    // raising this too, a cert upload near the 10MB app-level cap gets silently truncated
    // by the proxy layer first, crashing with a raw 500 instead of the friendly
    // file_too_large redirect saveStepAndContinue is supposed to give it.
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;
