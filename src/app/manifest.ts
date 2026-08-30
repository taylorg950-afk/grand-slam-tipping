import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Tipping Post',
    short_name: 'Tipping Post',
    description: 'Private tipping competition for the four Grand Slams',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#EEF1FA',
    theme_color: '#00308F',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }
}
