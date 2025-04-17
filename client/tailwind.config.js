/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary colors for all themes
        // Purple theme (default)
        purple: {
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Blue theme
        blue: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Green theme 
        green: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Red theme
        red: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Orange theme
        orange: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      backgroundColor: {
        dark: '#121212',
        'dark-card': '#1e1e1e',
      },
      textColor: {
        'dark-primary': '#e0e0e0',
        'dark-secondary': '#a0a0a0',
      },
    },
  },
  plugins: [
    function({ addBase, theme }) {
      // Theme variables using CSS variables
      addBase({
        ':root': {
          // Default colors (purple theme)
          '--color-primary-400': theme('colors.purple.400'),
          '--color-primary-500': theme('colors.purple.500'),
          '--color-primary-600': theme('colors.purple.600'),
          '--color-primary-700': theme('colors.purple.700'),
          '--color-primary-800': theme('colors.purple.800'),
          '--color-primary-900': theme('colors.purple.900'),
        },
        '.theme-blue': {
          '--color-primary-400': theme('colors.blue.400'),
          '--color-primary-500': theme('colors.blue.500'),
          '--color-primary-600': theme('colors.blue.600'),
          '--color-primary-700': theme('colors.blue.700'),
          '--color-primary-800': theme('colors.blue.800'),
          '--color-primary-900': theme('colors.blue.900'),
        },
        '.theme-green': {
          '--color-primary-400': theme('colors.green.400'),
          '--color-primary-500': theme('colors.green.500'),
          '--color-primary-600': theme('colors.green.600'),
          '--color-primary-700': theme('colors.green.700'),
          '--color-primary-800': theme('colors.green.800'),
          '--color-primary-900': theme('colors.green.900'),
        },
        '.theme-red': {
          '--color-primary-400': theme('colors.red.400'),
          '--color-primary-500': theme('colors.red.500'),
          '--color-primary-600': theme('colors.red.600'),
          '--color-primary-700': theme('colors.red.700'),
          '--color-primary-800': theme('colors.red.800'),
          '--color-primary-900': theme('colors.red.900'),
        },
        '.theme-orange': {
          '--color-primary-400': theme('colors.orange.400'),
          '--color-primary-500': theme('colors.orange.500'),
          '--color-primary-600': theme('colors.orange.600'),
          '--color-primary-700': theme('colors.orange.700'),
          '--color-primary-800': theme('colors.orange.800'),
          '--color-primary-900': theme('colors.orange.900'),
        },
      });
    }
  ],
}

