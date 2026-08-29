/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'api.dicebear.com', 'avatars.githubusercontent.com'],
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
