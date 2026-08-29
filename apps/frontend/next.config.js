/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  images: {
    domains: ['lh3.googleusercontent.com', 'api.dicebear.com', 'avatars.githubusercontent.com'],
  },
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
