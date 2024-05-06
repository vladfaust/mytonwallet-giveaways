/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,vue}"],
  plugins: [
    require("daisyui"), // DaisyUI, the UI framework for Tailwind CSS!
    function ({ addUtilities, addVariant }) {
      addUtilities({
        // .pressable to make a button look like it's being pressed.
        ".pressable:not(:disabled)": {
          "@apply active:scale-95": {},
        },
        ".pressable-sm:not(:disabled)": {
          "@apply active:scale-[0.975]": {},
        },
      });
    },
  ],
  daisyui: {
    themes: false, // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    prefix: "dz-", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
  },
};
