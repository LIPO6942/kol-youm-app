
import type { NextConfig } from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Désactivé totalement pour corriger les erreurs de corruption
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: false,
  workboxOptions: {
    disableDevLogs: true,
    exclude: [/api\/.*$/],
  },
  fallbacks: {
    image: "/icons/icon-512x512.png",
  }
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
      ,
      {
        protocol: 'https',
        hostname: 'lexica.art',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gen.pollinations.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      "https://*.firebase.studio",
      "https://*.cloudworkstations.dev",
    ],
  },
};

export default withPWA(nextConfig);
