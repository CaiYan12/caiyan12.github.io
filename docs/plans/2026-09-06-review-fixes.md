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

- [x] 2.1 `fetch-github-repos.mjs` 缓存损坏（SyntaxError）→ warn + 备份 `.corrupt-<ts>` + 空缓存重建（ENOENT 保持现状）；`main().catch()` 以明确错误非零退出
- [x] 2.2 `generate-lqips.mjs` 变体阶段逐图 try/catch（metadata/stat 合并守卫 + 单档变体失败 warn 跳过）；LQIP 变更检测改为**源图字节数**（计划原定 mtime，实施时改为 bytes：git checkout 不保留 mtime，mtime 方案会使 CI 每次全量重算 176 图；bytes 方案 CI 零成本），值格式迁移为 `{ g, bytes }`，lqip-utils.ts 同步适配，另加 `--refresh` 兜底同大小改图
- [x] 2.3 `sync-site-stats.mjs` toRecentComment/toGuestbookComment 对空白 bodyText 返回 null，调用方过滤（网络失败维持 fail-closed）
- [x] 2.4 `fetch-github-contributions.mjs` main 内 fetchContributions 包 try/catch，IO 失败 warn 不中断
- [x] 2.5 补单测："空内容评论/留言（纯表情空白）跳过本条而不阻塞整批同步"（覆盖 recent + guestbook 两条路径）
- 注：readPostTitles 只读 index.md 是 slug 规范契约，不做防御性扩展（不可达分支）
- [x] 验证：node --test 15/15 全过；沙箱实测损坏缓存（备份+重建+exit 0）；pnpm check 0 错、build 成功（137 条 LQIP 迁移新格式、变体 0 生成 52 复用）；contributions 独立运行 OK；dist 文章页 LQIP 渐变正常渲染
- [ ] commit 2

## 阶段 3：客户端逻辑 bug 批次（清单 #8 及逻辑轴小项）

- [x] 3.1 动态标题：hidden 分支只在标题非两段替代语时捕获 originalTitle（快速 hide→show→hide 不再永久丢失真实标题）
- [x] 3.2 四处静默 catch → console.warn（fancybox import / katex css / mermaid / 背景配置；copyText 的 catch 属正常回退链保持原样）
- [x] 3.3 Fancybox 竞态：import resolve 后先 `unbind("[data-fancybox]")` 再标记+绑定，保证并发重入只留一份委托监听
- [x] 3.4 导航前缀匹配加路径段边界（/link/ 不再命中 /link-survey/）
- [x] 3.5 initBackToTop/initMMenu 补 dataset 守卫 + scroll 回调同值短路
- [x] 3.6 点击特效两处 forEach+splice 改倒序 for（circles 越界回收 / booms 停止回收）
- [x] 3.7 contributions-calendar assertValidData 补逐日 /^\d{4}-\d{2}-\d{2}$/ 校验（防 NaN 年月日）
- [x] 3.8 image-variants existsSync 模块级 Set 记忆化 + resetVariantCache 导出
- [x] 验证：astro check 0 错、build 成功（LQIP bytes 检测 0 重复处理）；Playwright 模拟 visibilitychange 快速序列标题恢复真实值（pass=true）；Swup 多页导航高亮正确（/tag/ 呈父项+子项 current，首页 / 唯一 current，300ms 内稳定）；无新增 page error（myhkw 播放器"禁止重复添加"抛错为既有第三方问题，记录备查不属本次范围）
- [x] commit 3

## 阶段 4：a11y 结构项（清单 #9，无视觉争议）

- [x] 4.1 MMenu：Escape 关闭并把焦点归还 #open-nav、打开时焦点移入菜单（首个 input/a/button）、#open-nav aria-expanded（JS 双向同步）+aria-controls、nav 去冗余 role 加 aria-label
- [x] 4.2 Slideshow 指示点 li 内原生 button（aria-label="第 N 张：标题"）；圆点样式迁移到 `.carousel-indicators li button`，实测渲染与改前一致
- [x] 4.3 aria-current="page"：Navbar/MMenu SSR 按 isCurrent 输出；syncNavHighlight 首循环扩到 `#nav a, #mmenu a` 并同步维护 aria-current（顺带修复 MMenu 子项 current 切页后不重算的隐性陈旧问题）
- [x] 4.4 MMenu 与 404 搜索框补 aria-label="搜索关键词"
- [x] 4.5 BackToTop div→button（type/aria-label/title）；display 切换逻辑保持（效果与 hidden 等价）
- [x] 4.6 MainGridLayout #content 去重复 role="main"（main 地标回归唯一）
- [x] 4.7 Search.svelte 持久化 aria-live="polite" 状态区（搜索中/结果数/出错可感知）；访客错误文案"搜索暂时不可用，请稍后再试"，技术细节转 console.warn
- [x] 4.8 （JSON-LD `<` 转义→移至阶段 5 与文章页 h1 改动同文件执行，见阶段 5 备注）
- [x] 4.9 rehype-email-protection：移除内联 onclick，改 data-email-method 标注 + theme-script initProtectedEmail 事件委托（CSP script-src 兼容，Swup 后仍生效）
- [x] 验证：format/check/build 全绿；Playwright 实测——aria-current 首页唯一、移动视口菜单开→焦点入菜单→Escape 关→焦点归还 open-nav→aria-expanded 复位、指示点 5 个 button 带正确 aria-label、backtop 为 BUTTON、main 地标数=1、无 page error
- [x] commit 4

## 阶段 5：视觉敏感三项（克制版，清单 #6/#10/#15）

- [x] 5.1 Giscus.astro：8s 超时检测 + IntersectionObserver 先确认用户看过评论区（data-loading="lazy" 下避免未滚动误报）→ 失败显示 Colorful 卡片风格提示（.giscus-fallback，白底圆角细边框）+ 重试按钮（按原脚本属性重建 script 重新加载）。**实施陷阱记录**：带内容的内联 `<script>` 位于三元表达式容器内会使 prettier-plugin-astro 脚本解析失败——watcher 必须渲染在表达式之外，靠 giscus-src 存在性自检实现"未启用即退出"
- [x] 5.2 h1 层级：20 个页面主标题 h2→h1（posts/[...slug] + 19 个独立页/空态，node 脚本批量 + 复核每文件恰 1 个 h1）；去掉 title.slice(0,50) 无声截断；站名两处 h1 保留（1:1 还原）；CSS `.page .post-header` 与 `.post-header` 两组选择器追加 h1（PostCard 卡片标题保持 h2 层级不变）；实测文章页 h1 计算样式与原 h2 完全一致（20px/25px/#000）
- [x] 5.3 对比度（正文级达 AA，装饰不动）：--text-light #999→#767676（17 处随 token 生效）、--colorful-muted #999aaa→#667a8a（保蓝灰调，边框用例随之略深）、.post-metaa/.post-toc summary/.skill-section h3 span 的 #999 与输入类 #aaa 四处 →#767676；#ccc 装饰性图标色不动
- 附：JSON-LD `<` 转义已在本阶段与 [...slug] 改动同文件落地（4.8 顺延至此）
- [x] 验证：format/check/build 全绿；Playwright 实测——route.abort 模拟 giscus.app 不可达：滚动到评论区 8s 后提示卡出现、点重试重新注入脚本并再武装超时（隐藏→再现）；h1 计算样式与改前一致；.post-metaa 计算色 #666（AA 达标）
- [x] commit 5

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
