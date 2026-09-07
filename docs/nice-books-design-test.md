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
