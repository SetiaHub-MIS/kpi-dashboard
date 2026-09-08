/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only; 'media' makes css-interop throw on web when it
  // observes a colour-scheme change it cannot apply.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#E9E9E7',
        app: '#F4F4F2',
        card: '#FFFFFF',
        line: '#E1E1DE',
        rule: '#EDEDEA',
        ink: {
          DEFAULT: '#17181A',
          2: '#3A3B38',
          3: '#5C5E5B',
          4: '#6C6E6A',
          5: '#8A8B87',
          6: '#A0A19D',
          7: '#C3C3BE',
          8: '#C9C9C4',
        },
        pass: { DEFAULT: '#1F7A4D', bg: '#E8F3EC' },
        warn: {
          DEFAULT: '#A5691A',
          bg: '#FBF1DF',
          card: '#FBF3E4',
          line: '#EEDFBE',
          ink: '#6B4610',
        },
        fail: { DEFAULT: '#B0402E', bg: '#F8E7E3' },
        link: '#2E63D8',
      },
      fontFamily: {
        sans: ['PublicSans_400Regular'],
        'sans-med': ['PublicSans_500Medium'],
        'sans-semi': ['PublicSans_600SemiBold'],
        'sans-bold': ['PublicSans_700Bold'],
        mono: ['IBMPlexMono_400Regular'],
        'mono-med': ['IBMPlexMono_500Medium'],
        'mono-semi': ['IBMPlexMono_600SemiBold'],
      },
      letterSpacing: {
        label: '1.3px',
        tightest: '-1px',
      },
    },
  },
  plugins: [],
};
