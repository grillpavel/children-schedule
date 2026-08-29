import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Zlom mobil/desktop je 768 px (BL-051, design_review_84.md) — původně 900px,
      // sníženo poté, co BL-053 (min. šířka sloupce mřížky + horizontální scroll)
      // odstranilo původně naměřenou regresi (design_review_77.md §0.3).
      screens: {
        desk: '768px',
      },
    },
  },
  plugins: [],
};

export default config;
