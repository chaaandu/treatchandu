import type { NextConfig } from "next";

// The page is live data on every request (queue, calendar, sugar), so no Cache Components here.
const nextConfig: NextConfig = { devIndicators: false };

export default nextConfig;
