/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['aehtarohptmtrgksxhll.supabase.co', 'crafatar.com', 'mc-heads.net', 'ui-avatars.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tr.rbxcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'www.roblox.com',
      },
      {
        protocol: 'https',
        hostname: 'thumbnails.roblox.com',
      },
      {
        protocol: 'https',
        hostname: 'hhyqkflwqlfzjvswarty.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'aehtarohptmtrgksxhll.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'apis.roblox.com',
      },
      {
        protocol: 'https',
        hostname: 'crafatar.com',
      },
      {
        protocol: 'https',
        hostname: 'mc-heads.net',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-scripts.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob: https: *.roblox.com *.rbxcdn.com *.supabase.co cdn.discordapp.com mc-heads.net ui-avatars.com crafatar.com;
              font-src 'self' data:;
              connect-src 'self' https://*.supabase.co https://apis.roblox.com wss://*.supabase.co;
              frame-src 'self';
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

