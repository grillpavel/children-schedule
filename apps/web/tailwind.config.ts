import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Zlom mobil/desktop je 900 px (Changes 9 C9-L5), ne výchozí md (768).
      screens: {
        desk: '900px',
      },
    },
  },
  plugins: [],
};

export default config;
