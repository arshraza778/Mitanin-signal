/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans Devanagari", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Existing app colors preserved
        ink: "#26215C",
        purple: {
          DEFAULT: "#534AB7",
          light: "#EEEDFE",
        },
        teal: {
          DEFAULT: "#0F6E56",
          light: "#E1F5EE",
        },
        coral: {
          DEFAULT: "#C8472A",
          light: "#FAECE7",
        },
        amber: {
          DEFAULT: "#A8650A",
          light: "#FAEEDA",
        },
        forest: {
          DEFAULT: "#3B6D11",
          light: "#EAF3DE",
        },
        canvas: "#F5F4FA",
        borderline: "#E3E1EC",
        inktext: "#1F1D2B",
        muted: "#6B6880",

        // Stitch Field & Public Health tokens
        primary: {
          DEFAULT: "#00433b",
          container: "#0d5c52",
          fixed: "#abf0e2",
          "fixed-dim": "#8fd3c6",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#8ed2c5",
        "on-primary-fixed": "#00201c",
        "on-primary-fixed-variant": "#005047",
        "inverse-primary": "#8fd3c6",

        secondary: {
          DEFAULT: "#0051d5",
          container: "#316bf3",
          fixed: "#dbe1ff",
          "fixed-dim": "#b4c5ff",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fefcff",
        "on-secondary-fixed": "#00174b",
        "on-secondary-fixed-variant": "#003ea8",

        tertiary: {
          DEFAULT: "#5c2f00",
          container: "#7e4200",
          fixed: "#ffdcc3",
          "fixed-dim": "#ffb77d",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffb579",
        "on-tertiary-fixed": "#2f1500",
        "on-tertiary-fixed-variant": "#6e3900",

        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        surface: {
          DEFAULT: "#f7f9fb",
          dim: "#d8dadc",
          bright: "#f7f9fb",
          container: "#eceef0",
          "container-low": "#f2f4f6",
          "container-high": "#e6e8ea",
          "container-highest": "#e0e3e5",
          "container-lowest": "#ffffff",
          variant: "#e0e3e5",
          tint: "#21695f",
        },
        "on-surface": "#191c1e",
        "on-surface-variant": "#3f4946",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",

        outline: {
          DEFAULT: "#6f7976",
          variant: "#bec9c5",
        },

        // Brand palette from login & portal gateway
        brand: {
          50: "#eff9f7",
          100: "#d7f0eb",
          200: "#b1e1d7",
          300: "#7eccbf",
          400: "#4faea1",
          500: "#158074",
          600: "#0d5c52",
          700: "#0a4b43",
          800: "#083c35",
          900: "#052924",
          950: "#021815",
        },
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        gutter: "1rem",
        "gutter-desktop": "1.5rem",
        margin: "1rem",
        "margin-desktop": "2rem",
      },
      borderRadius: {
        'card': '14px',
        'card-lg': '16px',
      }
    },
  },
  plugins: [],
}
