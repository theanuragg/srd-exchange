/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        pathname: '/logos/**',
      },
    ],
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    config.watchOptions = {
      ignored: ['../contracts/**', '../artifacts/**', '../cache/**']
    };

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
