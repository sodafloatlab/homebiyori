/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['var(--font-inter)', 'sans-serif'],
        'noto-sans-jp': ['var(--font-noto-sans-jp)', 'sans-serif'],
        'zen-maru-gothic': ['var(--font-noto-sans-jp)', 'sans-serif'], // fallback
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'sparkleFloat': 'sparkleFloat 3s ease-in-out infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
      },
      keyframes: {
        sparkleFloat: {
          '0%, 100%': { 
            transform: 'translateY(0px)' 
          },
          '33%': { 
            transform: 'translateY(-15px)' 
          },
          '66%': { 
            transform: 'translateY(-8px)' 
          },
        },
        sparkle: {
          '0%, 100%': { 
            opacity: '0.8',
            filter: 'brightness(1)'
          },
          '50%': { 
            opacity: '1',
            filter: 'brightness(1.3)'
          },
        },
      },
      scale: {
        '110': '1.1',
        '115': '1.15',
      },
      brightness: {
        '120': '1.2',
        '130': '1.3',
      },
      saturate: {
        '120': '1.2',
      }
    },
  },
  plugins: [],
}