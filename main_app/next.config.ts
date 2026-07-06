/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },

  allowedDevOrigins: [
    "https://flatten-from-removed.ngrok-free.dev",
    "flatten-from-removed.ngrok-free.dev"
  ],
  serverExternalPackages: ['@prisma/client'],
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@ant-design/v5-patch-for-react-19': require('path').resolve(
        __dirname,
        'lib/shims/antd-react-19-patch.ts'
      ),
    };

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        pathname: '/logos/**',
      },
    ],
  },
};

module.exports = nextConfig;
