# Nice Books 设计升级验收记录

日期：2026-09-07。状态：实施与本地验收完成，交付人工审查。最终产物标识：**build4**。

## 基准与边界

- 源码基准：`984fc0c6636c3e6439ad364934d59bdc2abfb170`，当前工作区实施，无自动提交/推送/部署。
- 规划期基线：27项单测、49项原有smoke；本次重新验证为41项单测、56项smoke与65项设计QA。
- 验收环境：Windows、本地 Chromium，`build + preview`，入口 `http://127.0.0.1:4322/books/`；未发布到生产站点。
- 书籍数据与路由、独立壳、访问级随机、六字段搜索、Pagefind排除语义保持。

## 检查矩阵

| 项目 | 状态 | 证据 |
|---|---|---|
| Astro check | 通过 | 153文件，0 errors / 0 warnings / 2 hints；最终TS改动后运行 |
| 单元测试 | 41/41通过 | 最终build链执行，含22本标题安全区、四族配色、腰封变体与状态语义 |
| 生产构建 | 通过 | `build-4.log`，退出码0；Pagefind仍仅索引12个主站页面 |
| 业务 smoke | 56/56通过 | 在build4 preview执行，包含双入口忙碌、推荐组中断、标签键盘焦点及图片回退 |
| 设计/动效/故障 QA | 65/65通过 | `qa-report.json`明确标记build4 |
| 320/390/540/541/760/960/1280 响应式 | 通过 | 三页均无整页横向溢出；网格列数及手机详情顺序符合计划 |
| 200% 缩放/键盘路径 | 通过 | 独立Chromium扩展调用`chrome.tabs.setZoom`，回读`getZoom=2`；三页各12步可见焦点 |
| 四封面族与精选腰封 | 通过 | 22本全部网格/列表截图、标题安全线单测、主书和360px窄卡几何与CUA检查 |
| 真实封面失败/字体失败 | 通过 | 网络失败图片被同ID确定性SVG替换；阻断字体CDN后内容仍可读 |
| Swup 取消与重试 | 通过 | 切页中断后新页无残留忙碌；书库请求失败显示重试并恢复 |
| 减少动态效果和触屏 | 通过 | reduced媒体检查；390px触屏context实测coarse=true、hover/fine=false，触摸前后书封transform均为none |
| 资源隔离和体积 | 通过 | 主站不请求books专用资源或GSAP；体积见下方采样 |
| CUA实机视觉检查 | 通过 | 桌面三页、手机详情/书库，另逐图检查主书退出—入场帧；build4复查腰封裁切 |
| 独立代码审查 | 通过 | Luna high按独占文件并行修复，布局/封面/动效和跨模块独立复核收口 |

## 动效、字体与资源采样

- 主书完整动作实测 **432.6ms**，从点击到双入口恢复可用；26个rAF样本，最大帧间隔22.6ms。截图另行采集，不将截图等待计入耗时。
- GSAP chunk请求被实际阻断后，新书ID仍发生变化，双入口先同步忙碌再恢复，未发生未捕获异常。
- CDP实际字形检查：可见正文命中Noto字体（内部族名`Noto Sans SC Thin`，custom，50个字形）；书名命中`FZShuSong-Z01S`（本机平台字体）；章节编号命中`JetBrains Mono`。内部字体族名不等同于CSS字重。
- 新增GSAP运行库为70,848B，gzip-9后27,848B；当前chunk为`index.Bvu9zNsI.js`。没有旧版完整网络基线，不声称整个站点的体积增减。
- 主站未加载实体书组件样式及GSAP；共享字体和Tailwind通用工具样式保留项目既有构建方式。

| 本地验收会话 | LCP | CLS | 观测资源传输量 |
|---|---:|---:|---:|
| 首页 | 772ms | 0 | 1,305,117B |
| 书库 | 60ms | 0.07 | 192,868B |
| 详情 | 380ms | 0 | 126,436B |

以上是同一浏览器会话中的本地preview采样，包含缓存与200%缩放检查，不能视为生产网络性能基准或三页冷启动对比。

## 产物

自动化截图、JSON结果和关键动作帧存放于 `output/nice-books-design/`（本地产物，不进入Git）：

- [桌面首页](../output/nice-books-design/home-1280.png) / [手机首页](../output/nice-books-design/home-390.png)
- [桌面书库](../output/nice-books-design/archive-1280.png) / [手机书库](../output/nice-books-design/archive-390.png)
- [桌面详情](../output/nice-books-design/detail-1280.png) / [手机详情](../output/nice-books-design/detail-390.png)
- [22本书网格](../output/nice-books-design/archive-grid-all-1280.png) / [22本书列表](../output/nice-books-design/archive-list-all-1280.png)
- [换书退出帧](../output/nice-books-design/hero-swap-frame-00.png) / [入场帧](../output/nice-books-design/hero-swap-frame-12.png) / [落桌帧](../output/nice-books-design/hero-swap-frame-24.png)
- [原生200%缩放](../output/nice-books-design/archive-zoom-200.png) / [设计QA JSON](../output/nice-books-design/qa-report.json)

完整构建日志、独立审查和原生缩放/字体/资源JSON位于 `.superpowers/sdd/nice-books-design-upgrade/`。早期诊断与最终build4严格区分；无效的截图循环计时未作为产品性能结论。

## 复跑

```powershell
pnpm check
pnpm build
pnpm preview --host 127.0.0.1 --port 4322
# 在另一终端运行
$env:NICE_BOOKS_BASE_URL='http://127.0.0.1:4322/books/'
pnpm smoke:nice-books
$env:NB_BUILD_LABEL='manual-review'
node scripts/nice-books-design-qa.mjs
```

## 限制

本机浏览器设备模拟不是实体手机硬件证明；性能采样仅代表记录的本机环境。CDN故障与功能失败分开记录，当前验收未观察到意外CDN失败；标题实际使用本机书宋，不能把它写成远程字体下载成功的证据。保留构建中的cover静态/动态混合导入提示及既有Mermaid大chunk提示；未修改框架版本。最终审美接受度交由用户人工审查。

## 2026-09-08 Book3D 几何层重构复验

- 删除旧的 `--depth-x/y` 屏幕错位、`back` 扩宽遮挡、顶面/书口 `clip-path` 拼接、固定宽度弧形书脊、`spine::before` 顶部补面，以及腰封 `width + right` 补偿。
- 新增 `lib/book-geometry.ts`，hero/card/list 共享同一 `BookGeometry` 接口与 CSS Variables 输出；封面 SVG、真实图片回退和书籍数据未改。
- 新增 `pnpm qa:nice-books-geometry`：在开发服务器上覆盖三页、320/390/768/1024/1280、换书后和 reduced-motion，共 **1239** 项运行时断言，验证前后封尺寸、双倍 depth 书口、页块三面、前封腰封及窄折边、断口补丁缺失与整页 overflow。

## 2026-09-08 CodePen 框架复刻与七轮视觉复验

- 参考实现：[CSS 3D book from a flat cover image](https://codepen.io/shanomurphy/pen/xxqVdxM)。按其 `front +thickness / back -thickness / pages 2×thickness / rotateY(-25deg)` 关系重写，未引入 Three.js 或位图书体。
- 连续完成七轮“修改—截图—自评—优化”。关键纠正包括：移除会压平 3D 上下文的 `filter`、让详情页命中 hover、把书口提升为直接子面、恢复书口双面可见、把书口旋转原点从旧盒体的左缘改回参考实现的中心、让后封和书脊继承封面主色。
- 用户补充后的腰封标准：只覆盖前封纸面，并以 `boardThickness + 3px` 的窄面绕过前封右缘；DOM 与 CSS 均不再生成后封／书脊腰封，因此白色书口从上到下保持连续。
- 每轮静态与 hover 截图位于 `output/playwright/nice-books-three-faces/round-1` 至 `round-7`；跨页最终截图为同目录的 `home-desktop.png`、`archive-desktop.png`、`detail-desktop.png` 和 `home-mobile.png`。
- 补充视觉修正：移除主书顶部胶带，改为封面右上印章红燕尾书签；静态和 hover 截图见同目录 `round-8-marker/rest.png` 与 `hover.png`。
- 同架/书库小书腰封回归：180px 卡片压缩标题与两行荐语布局，书宽不超过 159px 时通过 container query 收敛为 17px + 28px；390px 实测腰封 `clientHeight=51`、`scrollHeight=51`，运行时几何 QA 同步检查荐语盒底边不越界。
- 本轮开发服务器回归：单测 **45/45**、smoke **56/56**、设计 QA **65/65**；`pnpm check` 为 0 errors / 0 warnings / 2 个既有 hints，`pnpm build` 退出码 0。构建自动更新的数据缓存已恢复，没有混入工作区。
- 自动截图位于 `output/nice-books-design/`；该轮以自然商业书籍视角为准，正面为主、右书口明确、顶部只作结构提示。
