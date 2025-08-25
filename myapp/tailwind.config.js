// /** @type {import('tailwindcss').Config} */
// export default {
//  content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}"
//   ],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }




export default {
  darkMode: 'class', // required
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-fg)",
        card: "var(--color-card)",
        accent: "var(--color-accent)",
        muted: "var(--color-muted)",
      },
    },
  },
  plugins: [],
};
