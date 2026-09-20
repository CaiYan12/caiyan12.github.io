import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import postcssNesting from "tailwindcss/nesting/index.js";

// Tailwind 接入的唯一真相源。原先由 @astrojs/tailwind 注入，但该集成的 peer 只到
// tailwind ^3/^4/^5、不认 Astro 6，是升级的硬阻碍，故改为直接走 Vite 的 postcss 配置。
// 插件顺序照集成此前的实际产出（nesting -> tailwind -> autoprefixer）：集成会读取本文件
// 再往后追加这三项，而原先 import 的 postcss-import 既非直接依赖、全站 CSS 又零 @import，
// 属无效声明（且会让本文件在集成里静默加载失败），一并去掉。
export default {
  plugins: [postcssNesting(), tailwindcss(), autoprefixer()],
};
