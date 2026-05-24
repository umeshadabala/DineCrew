export default function manifest() {
  return {
    name: 'DineCrew Tipping & Feedback',
    short_name: 'DineCrew',
    description: 'The Unified Tipping & Guest Feedback Platform for Modern Hospitality',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
