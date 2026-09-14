# 友链图标构建期缓存计划

## Global Constraints

- 缓存资产和清单提交到 Git；普通构建只补缺，只有 `--refresh` 更新已有图标。
- 删除友链不清理历史缓存。
- 外站失败保留旧缓存并继续构建；无旧缓存显示首字占位。
- 页面运行时不请求任何外部友链图标服务。
- 缓存位于 `public/friend-icons/`，并与 LQIP/响应式图片流水线隔离。
- 不 push、merge 或部署。

## Task 1: 数据契约、抓取核心与测试

- [x] 将友链原始数据迁至 `src/data/friends.json`，保留 `src/data/friends.ts` 类型与兼容导出。
- [x] 新增版本化 `src/constants/friend-icons.json` 与可测试的抓取模块/命令入口。
- [x] URL 仅接受 HTTP/HTTPS，移除 fragment，保留 path/query，统一默认端口和根路径。
- [x] 图标优先级：远程显式 `avatar`、HTML `icon`、`shortcut icon`、`apple-touch-icon`、最终站点 `/favicon.ico`；根相对本地 avatar 直接验证使用。
- [x] 使用正式 HTML 解析器；请求具备超时、重定向上限、1 MiB 上限和 User-Agent。
- [x] 只接受并校验 PNG/JPEG/WebP/GIF/ICO；拒绝 SVG、HTML、非 HTTP URL 和伪图片。
- [x] 资产按规范化友链 URL 稳定哈希命名，采用临时文件和原子替换。
- [x] 普通模式只补缺，`--refresh` 刷新当前友链并重试负缓存条目；失败保留旧缓存，系统 I/O/清单损坏非零退出。
- [x] 用注入 fetch 和临时目录覆盖规范化、发现、回退、错误响应、缓存复用、刷新及原子性测试。

## Task 2: 页面与构建集成

- [x] 友链页只读取本地缓存路径，移除远程 favicon 与 Google S2 回退。
- [x] 本地图标失败时移除图片，显示现有首字占位。
- [x] 增加 `fetch-friend-icons` 命令并在 LQIP 之前接入 `pnpm build`。
- [x] 明确 `public/friend-icons/` 不参与 LQIP 扫描。
- [x] 验证测试、`pnpm check`、`pnpm build`，并断言 dist 友链 HTML 没有外部图标 URL。

## Task 3: 文档与验收

- [x] README 与项目维护说明记录新增友链、补缺、强刷（含重试负缓存）、Git 缓存提交、历史缓存保留和 CI 临时缓存边界。
- [x] 日志稳定使用 `CACHED`、`FETCHED`、`KEPT OLD`、`FALLBACK`。
- [x] 连续两次普通抓取确认第二次零请求且无缓存 diff。
- [x] 隔离验证命令行 `--refresh`（含负缓存重试）并记录缓存差异。
- [x] preview 桌面/移动检查，并用 Network 证明初始加载无外部图标请求。
- [x] 完成任务级审查、全分支双轴代码审查和最终完整测试。
