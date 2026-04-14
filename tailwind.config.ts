import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['variant', [
    '&:is(.dark *)',
    '&:is(.black *)',
    '&:is(.blue *)',
    '&:is(.red *)',
    '&:is(.green *)',
  ]],
  theme: {
    extend: {
      fontFamily: {
        'minecraft': ['var(--font-minecraft)', 'monospace'],
      },
      colors: {
        // MBA Brand Colors (NBA-style red/blue)
        'mba-blue': '#1D428A',    // NBA blue
        'mba-red': '#C8102E',     // NBA red
        'mba-dark': '#0A0E27',
        'mba-light': '#F5F5F5',
        // Minecraft-inspired colors
        'minecraft-grass': '#7CBD3B',
        'minecraft-stone': '#7D7D7D',
        'minecraft-dirt': '#8B5A2B',
        'minecraft-wood': '#9C6F3C',
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        'minecraft': '0px',
      },
      boxShadow: {
        'minecraft': '4px 4px 0px rgba(0, 0, 0, 0.25)',
        'minecraft-lg': '6px 6px 0px rgba(0, 0, 0, 0.3)',
        'minecraft-sm': '2px 2px 0px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;
