/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the persona markdown is bundled into the serverless functions.
  outputFileTracingIncludes: {
    "/api/**": ["./content/**"],
  },
};

export default nextConfig;
