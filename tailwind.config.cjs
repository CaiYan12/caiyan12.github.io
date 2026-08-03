/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#00c000", // Colorful 主色（海洋绿）
        primarydark: "#0a0",
        hot: "#ffba00", // 热门标签
        new: "#00c700", // 近期更新
        pagebg: "#f4f5f7", // 页面背景
        line: "#eaeaea", // 边框线
      },
      fontFamily: {
        sans: [
          '"Classic Grotesque W01"',
          '"Hiragino Sans GB"',
          '"STHeiti"',
          '"Microsoft YaHei"',
          '"WenQuanYi Micro Hei"',
          "Arial",
          "SimSun",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono Variable'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        wrapper: "0 2px 6px rgba(100,100,100,0.3)",
      },
      borderRadius: {
        box: "5px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
