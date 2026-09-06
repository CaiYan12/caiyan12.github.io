# 审查修复计划（2026-09-06）

> 来源：2026-09-06 全仓库七维深度审查（总评 17/25）。十六项发现按「必要性×2 + 进步大小×1.5 + 易于修改×1」排序，分 7 阶段执行。
> **已定决策**：范围=全部 16 项（Astro 升级仅评估不实施）；架构=先补测试再做列表页收敛，theme-script 只修 bug+文档化协议不做拆分；提交=每阶段 commit、最后统一 push；视觉敏感三项=克制版全做。
> **每阶段通用验收**：pnpm check 0 错 → pnpm build 成功 → pnpm preview + Playwright 实机抽查 → 既有单测全过 → commit（含本文件状态更新）。

## 阶段 0：基线准备

- [x] 提交工作区遗留的 AGENTS.md 用户改动（独立 commit `30ad855`）
- [x] 创建本计划文件
- [x] 基线验证：pnpm check + pnpm build 当前为绿（2026-09-06 实测通过，详见各阶段记录）

## 阶段 1：速胜包（清单 #2 canvas/轮播 reduced-motion、#1 Prettier、#3 srcset）

- [x] 1.1 `theme-script.ts` 新增 prefersReducedMotion 助手；initCanvasBoomEffect 入口守卫；initBackToTop/initDblClickScroll 两处 smooth 改条件
- [x] 1.2 `Slideshow.astro` start() 加 reduced-motion 守卫（hover 暂停保留）
- [x] 1.3 Prettier 补盲区：prettier-plugin-astro@0.14.1 + prettier-plugin-svelte@4.1.1；`.prettierrc.cjs` 注册插件与 astro/svelte overrides；format 扩到 src+scripts+tailwind.config；--write 消化 67 文件存量；顺带修两处插件不接受的模板写法（diary.astro 表达式内多根元素包 `<Fragment>`、Navbar.astro 表达式内 HTML 注释改 JSX 注释）
- [x] 1.4 删 `package.json` 坏 lint 脚本（引用未安装的 eslint）；format 范围扩大
- [x] 1.5 `image-variants.ts` origCandidates 只保留原图候选并留注释说明格式协商缺失
- [x] 验证（2026-09-06 preview+Playwright）：emulateMedia(reduce) 下点击无 #click-boom-canvas、轮播 5.5s 不切换；normal 下画布出现、4s 间隔正常推进；文章封面 `<source type="image/webp">` 存在且 img srcset 无 .webp；pnpm check 0 错、build 成功
- [x] commit 1

## 阶段 2：构建脚本容错（清单 #4）

- [ ] 2.1 `fetch-github-repos.mjs:98-105` 缓存 JSON 损坏 → warn + 备份 + 空缓存重建（ENOENT 保持现状）；:154 补 main().catch()
- [ ] 2.2 `generate-lqips.mjs` 变体阶段 :263/:277/:294 per-file try/catch；:139-142 LQIP 增量加 mtime 比较（manifest 存 mtimeMs）
- [ ] 2.3 `sync-site-stats.mjs:151-206/475-485` 空 bodyText 留言 → warn+跳过该节点（网络失败维持 fail-closed）
- [ ] 2.4 `fetch-github-contributions.mjs:178-189/194-226` main 包 try/catch，IO 失败 warn 不中断
- [ ] 2.5 补单测：sync-site-stats.test.mjs 加空 bodyText 用例
- 注：readPostTitles 只读 index.md 是 slug 规范契约，不做防御性扩展（不可达分支）
- [ ] 验证：故意损坏缓存副本实测重建路径；node --test 全过
- [ ] commit 2

## 阶段 3：客户端逻辑 bug 批次（清单 #8 及逻辑轴小项）

- [ ] 3.1 `theme-script.ts:748-763` 动态标题：只在标题非两段替代语时捕获 originalTitle
- [ ] 3.2 四处静默 catch → console.warn（:49-51/:441-445/:536-538/:953-961）
- [ ] 3.3 :27-52 Fancybox import 竞态：模块级 pending 旗帜 + bind 前先 unbind
- [ ] 3.4 :768-770 导航前缀匹配加路径段边界
- [ ] 3.5 :797-845 initBackToTop/initMMenu 补 bound 守卫旗帜 + scroll 回调同值短路
- [ ] 3.6 :664-672/:708-715 forEach 中 splice 改倒序 for
- [ ] 3.7 `contributions-calendar.ts:53-56` formatDateZh 补日期格式校验防 NaN
- [ ] 3.8 `image-variants.ts:57-64` existsSync 模块级 Set 记忆化
- [ ] 验证：Playwright 多次 Swup 切页回归（导航高亮/轮播/灯箱/标题切换）
- [ ] commit 3

## 阶段 4：a11y 结构项（清单 #9，无视觉争议）

- [ ] 4.1 MMenu：Escape 关闭、焦点管理、#open-nav aria-expanded+aria-controls、nav 可访问名称
- [ ] 4.2 `Slideshow.astro:21-24` 指示点 li→button + aria-label
- [ ] 4.3 导航 aria-current="page"：Navbar SSR 与 syncNavHighlight 双侧同步
- [ ] 4.4 `MMenu.astro:17`、`404.astro:18` 搜索框补 aria-label
- [ ] 4.5 `BackToTop.astro` div→button + hidden 切换
- [ ] 4.6 `MainGridLayout.astro:50-53` #content 去重复 role="main"
- [ ] 4.7 `Search.svelte` 结果容器 aria-live + 错误文案改访客友好
- [ ] 4.8 `posts/[...slug].astro:79-84` JSON-LD `<` 转义
- [ ] 4.9 `rehype-email-protection.mjs:73-96` onclick → data-* + 事件委托
- [ ] 验证：Playwright 键盘实测（Tab/Escape/焦点归还）
- [ ] commit 4

## 阶段 5：视觉敏感三项（克制版，清单 #6/#10/#15）

- [ ] 5.1 `Giscus.astro` 加载超时检测 + Colorful 风格失败提示卡 + 重试
- [ ] 5.2 h1 层级：文章/独立页主标题 h2→h1；去 title.slice(0,50) 截断；站名 h1 不动；逐断点实测
- [ ] 5.3 对比度：正文级灰字改 WCAG AA（--text-light #999→#767676 等逐处评估）；装饰/边框不动
- [ ] 验证：全页视觉抽查（桌面+680px 截图对比）；对比度抽检 ≥4.5:1
- [ ] commit 5

## 阶段 6：测试面 + 列表页家族收敛（清单 #7→#5）

- [ ] 6.1 content-utils.test.ts + pagination.test.ts（node --test）
- [ ] 6.2 抽公共件：Breadcrumb.astro、TagPillCloud.astro、分页纯函数 pageOf
- [ ] 6.3 迁移 8 页：tag/category/hot 家族（archive 同构则一并）
- [ ] 6.4 HTML diff 验收：迁移前后 dist 结构一致 = 视觉零回归
- [ ] commit 6

## 阶段 7：卫生收尾与文档（清单 #11-#16 剩余）

- [ ] 7.1 样式 token 5 项收敛（品牌绿三源/tint/药丸色盘/768 vs 770/阴影）
- [ ] 7.2 死代码/死数据与共享化（skills 悬空 ID、#totop、type 字段、令牌解析 lib、shuffle、githubUser 入 config、站名副本等）
- [ ] 7.3 .gitignore 补 .learnings/（git rm -r --cached）与 .superpowers/
- [ ] 7.4 deploy/build/lint.yml 第三方 action 钉 commit SHA
- [ ] 7.5 Swup 重初始化协议规则写入 AGENTS.md（拆分列为远期独立一期）
- [ ] 7.6 README TODO 8 补记 audit 触发记录（维持不实施）
- [ ] 7.7 README/CHANGELOG 记录本批次；确认 lint.yml 对 .astro/.svelte 真正生效
- [ ] commit 7

## 收尾

- [ ] 统一 push 全部 commit → deploy.yml 自动部署
- [ ] 线上验证：artifact/Last-Modified + 抽查首页/文章/相册/留言板 + reduced-motion 线上抽查
- [ ] 计划文件标记终态、更新记忆

## 边界约束

全程不碰 colorful-original.css；不改 deploy.yml cache:false；不重开 AGENTS.md 已否决事项（mermaid 体积/日历库等）；触碰 remark-extended.mjs 前先删 node_modules/.astro/（content layer 缓存坑）。
