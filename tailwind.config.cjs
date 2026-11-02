/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				// 海洋绿主色：与 global.css --colorful-green 保持人工同步
				// （bg-primary/N 透明度修饰符要求静态色值，不能引用 var）
				primary: "#00c000",
				primarydark: "#0a0",
				hot: "#ffba00", // 热门标签
				new: "#00c700", // 近期更新
				pagebg: "#f4f5f7", // 页面背景
				line: "#eaeaea", // 边框线
				// Nice Books 纸墨色板（design-handoff.md §5 权威值，变量定义在 src/nice-books/styles/books.css）
				nb: {
					paper: "var(--nb-paper)",
					surface: "var(--nb-surface)",
					note: "var(--nb-note)",
					ink: "var(--nb-ink)",
					"ink-soft": "var(--nb-ink-soft)",
					muted: "var(--nb-muted)",
					blue: "var(--nb-blue)",
					seal: "var(--nb-seal)",
					border: "var(--nb-border)",
					"border-strong": "var(--nb-border-strong)",
				},
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
				// Nice Books 字体槽位（方正书宋 CDN / 本地楷体栈；变量在 books.css）
				"nb-body": ["var(--nb-font-body)"],
				"nb-serif": ["var(--nb-font-serif)"],
				"nb-kai": ["var(--nb-font-kai)"],
				"nb-hand": ["var(--nb-font-hand)"],
				"nb-mono": ["var(--nb-font-mono)"],
			},
			boxShadow: {
				wrapper: "var(--shadow-wrapper)",
			},
			borderRadius: {
				box: "5px",
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
