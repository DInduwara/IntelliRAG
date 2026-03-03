import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Subtle custom grays for the new sleek look
        brand: {
          900: '#09090b',
          800: '#18181b',
        }
      }
    },
  },
  plugins: [
    typography,
  ],
} satisfies Config;
