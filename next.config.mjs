/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-only Next.js badge sits on top of the Log out button, so it is turned off.
  devIndicators: false,
  // Lets a second copy run for testing without clashing with the main one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
