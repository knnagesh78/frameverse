import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090a0d",
        panel: "#111318",
        line: "#252830",
        muted: "#9296a1",
        accent: "#b8ff67",
      },
      boxShadow: { glow: "0 0 40px rgba(184,255,103,.12)" },
    },
  },
  plugins: [],
};

export default config;
