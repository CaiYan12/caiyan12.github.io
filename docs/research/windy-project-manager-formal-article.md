# Windy Project Manager 正式技术文章研究记录

## 研究范围

- 目标：为 `D:\pages\myblog` 创建第一篇正式技术长文，主题为本地 `D:\Dev\windy-project-mgr`。
- 写作日期：2026-08-31（Asia/Shanghai）。
- 证据优先级：当前本地源码与测试结果 > 当前真实 Tauri 窗口观察 > 官方 Tauri 文档 > Pexels 图片页面。
- 文章类型：面向工程读者的技术论文式博客文章，不声称是 Nature/CNS 投稿或同行评审论文。

## 中心论点、证据与边界

中心论点：Windows 本地项目工具的可维护性主要来自边界分离——持久化记录与运行时扫描分离、Git 本地读取与网络分离、进程拉起与命令业务成功分离、前端编排与 Rust 本地能力分离。

### 直接证据

| 文章主张 | 直接证据 | 结论边界 |
| --- | --- | --- |
| 项目记录不含运行时扫描结果 | `D:\Dev\windy-project-mgr\src-tauri\src\project\types.rs:6-23`、`src-tauri\src\scanner\mod.rs:44-64` | 仅说明当前模型与扫描路径，不说明未来版本不会改变 |
| 项目与设置使用版本化 JSON 和原子写入 | `D:\Dev\windy-project-mgr\src-tauri\src\project\store.rs:9-64,101-121`、`src-tauri\src\project\settings.rs:1-9` | 原子替换降低截断风险，不等于数据库事务 |
| 扫描器根目录特征检查并可单项降级 | `D:\Dev\windy-project-mgr\src-tauri\src\scanner\mod.rs:1-5,54-64,159-224` | 不递归、不做 AST，不能推断完整源码理解 |
| Git 走系统 CLI、离线、不执行 fetch | `D:\Dev\windy-project-mgr\src-tauri\src\git\mod.rs:1-6,68-95,164-217` | 读取的是本地已有引用，不保证远端同步 |
| Windows Git 子进程隐藏控制台窗口 | `D:\Dev\windy-project-mgr\src-tauri\src\git\mod.rs:8-14,114-130,220-235` | 这是 Git 扫描子进程契约，不覆盖所有外部进程 |
| Run/Build 为分离式启动 | `D:\Dev\windy-project-mgr\src-tauri\src\launch\mod.rs:1-7,316-359`、`src-tauri\src\commands\actions.rs:49-62` | 成功只表示拉起，不表示命令退出成功 |
| 前端通过 Tauri IPC 调用 Rust | `D:\Dev\windy-project-mgr\src\lib\api.ts:1-3,54-112`、`src-tauri\src\commands\scan.rs:1-17` | 具体 command 名称以源码为准 |
| 添加流程先枚举脚本、后创建记录 | `D:\Dev\windy-project-mgr\src\components\AddProjectDialog.tsx:55-112,175-236` | 脚本枚举只覆盖根目录 bat/cmd/ps1 |
| 当前自动化验证通过 | 本轮 `pnpm test`：8 files / 87 tests；`pnpm build`：tsc + Vite 通过；`cargo test --manifest-path src-tauri/Cargo.toml`：155 tests passed | 证明当前工作区测试通过，不是所有 Windows 环境的统计保证 |
| 真实桌面路径 | 2026-08-31 通过 `pnpm tauri dev` 的 Tauri 窗口完成 Add Project、Dashboard 搜索、Detail、Settings，截图保存在博客资源目录 | 截图证明本机当前路径，不替代完整发布验收 |

## 官方文档来源

1. Tauri 官方文档仓库：<https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/develop/calling-rust.mdx>
   - 通过 Context7 `/tauri-apps/tauri-docs` 查询了 Tauri 2 command 注册与前端 `invoke` 调用模型。
2. 项目远程仓库主页：<https://github.com/CaiYan12/windy-project-mgr>
   - 文章只把它作为项目入口；实现事实以本地工作区为准。

## 图片来源

- 头图页面：<https://www.pexels.com/photo/workstation-while-working-on-the-webpage-6804581/>
- 作者：cottonbro studio。
- 下载资源：`D:\pages\myblog\public\images\posts\windy-project-manager-cover.jpg`。
- 页面描述为带有显示器、代码、主机和外设的现代工作台；文章使用原图作为横向头图，并保留页面链接作为来源说明。
- 为适配博客首屏，落盘资源在不放大的前提下压缩为 1920×1280 JPEG，文件大小约 180 KB；画面内容和横向构图保持不变。

## 实机截图资产

截图均来自真实运行的 `D:\Dev\windy-project-mgr\src-tauri\target\debug\windy-project-mgr.exe` 窗口，未使用浏览器 mock：

- `D:\pages\myblog\public\images\posts\windy-project-manager\dashboard.jpg`
- `D:\pages\myblog\public\images\posts\windy-project-manager\detail-overview.jpg`
- `D:\pages\myblog\public\images\posts\windy-project-manager\detail-technology-git.jpg`
- `D:\pages\myblog\public\images\posts\windy-project-manager\detail-commits.jpg`
- `D:\pages\myblog\public\images\posts\windy-project-manager\settings-appearance.jpg`

窗口观察到的关键事实：默认真实窗口截图为 802×631；目标卡片显示 Node、pnpm、TypeScript、Vite，Git 行为 `main · clean · ahead 2`；详情页显示 `start.bat` Run command 与未配置 Build command；Settings Appearance 显示 system/light/dark 与强调色预览。

## 写作约束

- 将“源码事实”“本轮自动化结果”“本机实机观察”“架构解释”和“未来推断”分开。
- 不把一次本机实机结果推广成所有 Windows 环境的性能或可用性结论。
- 不把分离式启动的成功写成脚本业务成功。
- 不将未实现的远程项目、Git 图形历史、多 Profile、缓存 TTL 等写成当前能力。
- 文章包含 Mermaid 流程图、时序图、状态图、思维导图，以及经博客 `remark-math` + `rehype-katex` 处理的 LaTeX 公式。
