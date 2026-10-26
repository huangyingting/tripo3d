import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tripo: {
          bg: '#070709',
          panel: '#121318',
          card: '#191b22',
          border: '#262936',
          gold: '#f5c518',
          goldHover: '#ffe14d',
          cyan: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
