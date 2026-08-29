import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Zlom mobil/desktop je 900 px (Changes 9 C9-L5). FR-W2-4/BL-051
      // zvažovalo posun na 768px, ale změřeno: rozbíjí to čitelnost sloupců
      // mřížky při otevřeném detailu (design_review_77.md §0.3).
      screens: {
        desk: '900px',
      },
    },
  },
  plugins: [],
};

export default config;
