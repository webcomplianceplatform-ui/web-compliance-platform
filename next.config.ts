
// NOTE: Next.js config typing can lag behind available keys in some versions.
// We keep this as `any` to avoid build-time type failures.
const nextConfig: any = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.local",
    "*.localhost",
  ],

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
