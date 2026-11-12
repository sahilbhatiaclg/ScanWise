/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base Neutrals
        surface: {
          light: '#FAFAFA',
          'light-card': '#FFFFFF',
          'light-border': '#E5E7EB',
          dark: '#0B0D10',
          'dark-card': '#14171C',
          'dark-border': '#232832',
        },
        // Primary Brand Accent (Botanical Emerald)
        brand: {
          DEFAULT: '#15803D',
          dark: '#34D399',
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
        },
        // Secondary Accent (Warm Amber / Slate)
        accent: {
          DEFAULT: '#D97706',
          dark: '#FBBF24',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        // Semantic Ratings
        rating: {
          safe: '#10B981',
          'safe-bg-light': '#ECFDF5',
          'safe-bg-dark': '#064E3B',
          adjustable: '#F59E0B',
          'adjustable-bg-light': '#FFFBEB',
          'adjustable-bg-dark': '#78350F',
          risk: '#EF4444',
          'risk-bg-light': '#FEF2F2',
          'risk-bg-dark': '#7F1D1D',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
        input: '10px',
      },
    },
  },
  plugins: [],
};

