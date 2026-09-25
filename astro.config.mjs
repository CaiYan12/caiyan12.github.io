import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import svelte, { vitePreprocess } from "@astrojs/svelte";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import { siteConfig } from "./src/config.ts";
import { markdownPipeline } from "./src/plugins/pipeline.mjs";

// dev 下 Vite 把懒加载的第三方 CSS（fancybox、katex）以运行时注入的 <style> 挂进 head。
// swup 的 updateHead 按"新页面没有此节点"把它删掉，而模块已在 Vite 图里、不会再注入一次，
// 于是客户端切页后灯箱与公式失去全部样式（灯箱容器从视口尺寸塌成文档高度）。
// persistAssets 让 head 同步跳过 style/link/script；生产构建里各页 CSS 是独立 <link>，
// 必须照常增删以免跨页样式泄漏，所以只在 dev 开启。
const isDev = process.argv.slice(2).includes("dev");

// https://astro.build/config
export default defineConfig({
	site: siteConfig.siteURL,
	base: "/",
	trailingSlash: "always",

	output: "static",

	integrations: [
		swup({
			theme: false,
			animationClass: "transition-swup-",
			containers: ["main"],
			smoothScrolling: false, // 禁用平滑滚动以提升性能，避免与锚点导航冲突
			cache: true,
			preload: true, // swup 默认鼠标悬停预加载
			ignore: ["[data-fancybox]"],
			accessibility: true,
			updateHead: isDev ? { persistAssets: true } : true,
			updateBodyClass: false,
			globalInstance: true,
			animateHistoryBrowsing: false,
			skipPopStateHandling: (event) => {
				// 跳过锚点链接的处理，让浏览器原生处理
				return (
					event.state &&
					event.state.url &&
					event.state.url.includes("#")
				);
			},
		}),
		expressiveCode({
			themes: ["github-light", "github-dark"],
			// 站点为纯白设计，禁用系统暗色媒体查询，避免系统暗色访客看到暗色代码块
			useDarkModeMediaQuery: false,
			plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					shellsession: { showLineNumbers: false },
					bash: { frame: "code" },
					shell: { frame: "code" },
					sh: { frame: "code" },
					zsh: { frame: "code" },
				},
			},
			styleOverrides: {
				codeBackground: "#f7f7f9",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "#f7f7f9",
					terminalBackground: "#f7f7f9",
					terminalTitlebarBackground: "#f7f7f9",
					editorTabBarBackground: "#f7f7f9",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "#00c000",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "#f7f7f9",
					terminalTitlebarBorderBottomColor: "none",
				},
			},
			frames: {
				showCopyToClipboardButton: true,
			},
		}),
		react(),
		svelte({
			preprocess: vitePreprocess(),
		}),
		sitemap({
			filter: (page) => !page.endsWith("/page/1/") && !page.includes("/books/data.json"),
		}),
	],
	markdown: {
		processor: unified(markdownPipeline()),
	},
	vite: {
		plugins: [
			{
				// `public/pelican-bike/index.html` 是 vendored 的自包含单文件游戏，不是 Astro 路由。
				// astro dev 用 Vite 的 public 静态中间件按路径直出文件，不做目录索引重写，于是导航链接
				// `/pelican-bike/` 在 dev 下 404（构建产物与 GitHub Pages 会正常解析到该 index.html）。
				// 这里只在 dev 补一次 URL 重写，使两端形态一致；configureServer 不在生产构建中运行，
				// 产物字节与线上行为均不受影响。
				name: "pelican-bike-dev-directory-index",
				configureServer(server) {
					server.middlewares.use((req, _res, next) => {
						if (req.url === "/pelican-bike/" || req.url === "/pelican-bike") {
							req.url = "/pelican-bike/index.html";
						}
						next();
					});
				},
			},
		],
		build: {
			assetsInlineLimit: 4096,
		},
		esbuild: {
			// 生产构建剔除 console.log/debug 与 debugger（warn/error 保留，线上排错用）
			drop: ["debugger"],
			pure: ["console.log", "console.debug"],
		},
	},
});
