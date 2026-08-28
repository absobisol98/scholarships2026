import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
