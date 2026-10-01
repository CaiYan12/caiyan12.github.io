# 第三方 widget：借形态，不借运行时

站长要求把 `rushhiii/notion-widgets` 的 `/quotes` 元件嵌进博客底部。调研后我们**没有嵌入它**，而是照它的卡面语法在本地重写了一个「语录条」。三条路都走通过去才得出这个结论，而且它推翻了一个想当然的理由，所以记下来。

**Considered options**

1. **iframe 作者托管实例** —— 直接死在对方部署的 CSP 上：`next.config.ts` 与 `vercel.json` 都发 `Content-Security-Policy: frame-ancestors 'self' https://*.vercel.app https://vercel.com https://*.notion.so …`，**不含 `*.github.io`**，浏览器会拒绝在本站加载它（2026-09-30 在 `https://viorastack.vercel.app/quotes?embed=1` 实测到该响应头）。README 里推荐的 `notion.busiyi.world` 当时本身返回 HTTP 526。
2. **Fork + 自建 Vercel + 自己的 Notion 库** —— 可行且比初看更能打（`quotefont`、`customtext`、`mode=daily` 都在），但仍拿不到本站卡面：`parseColorParam` 只接受 hex（`/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`），我们白卡是 `rgba(255,255,255,.86)`，传不进去；线宽固定 1px、圆角固定 `rounded-[1.1rem]`，而本站是 `5px`。此外全仓 grep `postMessage|ResizeObserver|scrollHeight` 零命中——**没有 auto-resize**，父页必须写死 iframe 高度；每次嵌入要背 Next 运行时约 9 个 JS chunk 与 13 个预载字体文件；内容更新要 Notion 集成 + Vercel cron + 部署钩子三件套。
3. **本地构建期元件** —— 采纳。语料进 `public/quotes/quote-catalog.js`，卡面由 `src/components/layout/QuoteBand.astro` 与 `global.css` 的 `.quote-band` 一族实现，字体走本站既有的 `@fontsource-variable` 自托管通道。零外部请求、零运维依赖，且能完全服从本站的圆角/边框/光标/断点语法。

**为什么这条值得记**：初版方案陈述「上游没有任何字体参数，所以嵌不了」——那是从 README 的 "Common Query Params" 摘要行读出来的，**源码里其实有 `quotefont` 与 `authorfont`**。结论没变，但理由是错的。真正挡路的是 CSP、rgba/圆角/线宽三处硬编码、以及无 auto-resize。

**Consequences**

- 以后再有「把这个 widget 嵌进来」的需求，先过这三问：**对方的 CSP 放不放行 `*.github.io`？它的样式接口能不能表达本站的卡面语法？它有没有把高度交还给父页？** 三问不过，就地转为本地实现，并把上游当视觉参照。
- 本站「客户端零请求」这条原则针对的是**第三方 API 单点**（GitHub 限流、giscus、看板娘那类），同源静态文件不在其列——天气那套 `public/weather/*.js` 已是先例，语录条的语料文件同理。不要把这条原则误读成"不许加载任何本地 JS"。
- 语录条**在 Emlog Colorful 原版里没有对照物**，它是本站新增元件，不是还原度漂移。按 `docs/adr/0004` 的政策，它属于「已采纳的基线」：还原度审计不得把它当漂移修回原版，也不得因为原版没有就判定它违规。
- 语料口径是**宁缺毋滥**：署名会直接显示给访客，所以写错作者就是造假。只收能追到一手出处的句子，出处与年份记在 `docs/quotes-review.md`（不下发到客户端）；追不到一手的常见句子集中列在该文件的「未入语料」表里，防止以后被重新加回来。
