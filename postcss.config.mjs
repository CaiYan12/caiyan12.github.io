import autoprefixer from "autoprefixer";
import postcssNesting from "postcss-nesting";

// Tailwind v4 已改由 @tailwindcss/vite 接管（见 astro.config.mjs 的 vite.plugins），
// 不再是 PostCSS 插件，故本文件只剩两项仍需保留的职责：
//
// 1. postcss-nesting —— 必需项，不是冗余：src/styles/global.css 有 8 处**无 `&` 符号的
//    隐式嵌套**（拉绳壁纸 SVG 的 .wpull__cord / .wpull__art 子规则，约 L7732-L7825），
//    没有嵌套处理器时这些规则是非法 CSS 会被整条丢弃。
//    注意来源变了：v3 时这个插件是 tailwindcss 包内附带的（`tailwindcss/nesting/index.js`），
//    v4 的包不再导出该子路径（ERR_PACKAGE_PATH_NOT_EXPORTED），故改为显式依赖 postcss-nesting。
//    移除前必须先把这 8 处改写成平铺写法。
// 2. autoprefixer —— v4 内置 Lightning CSS 会做自己的 prefixing，但两者的浏览器目标集
//    不同（autoprefixer 读 browserslist，本仓库无该配置故用其默认集；v4 硬编码
//    Safari 16.4 / Chrome 111 / Firefox 128）。实测本站 828 条自有规则在两条链下声明值
//    零差异，但前缀集合不同。保留 autoprefixer 是为了维持既有产物的前缀行为不变。
//
// 顺序照旧（nesting -> autoprefixer）：与集成此前的实际产出同形。
export default {
	plugins: [postcssNesting(), autoprefixer()],
};
