---
title: "前端特化 Web UI 设计开源项目索引（2026-09-03）"
published: 2026-09-03 13:49:06
description: "从液态玻璃、动效与设计系统，到工程化、可视化和 AI 编码，按场景整理的前端开源项目索引。"
image: "/images/posts/front-end-ui-tool-index-cover.jpg"
tags: ["前端", "开源", "Web UI", "GitHub"]
category: "前端"
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

# 前端特化 Web UI 设计开源项目索引

这份索引覆盖液态玻璃与毛玻璃、动效引擎、创意组件、AI 应用界面、无限画布、设计系统、工程化工具链、数据可视化，以及 AI 编码与前端技能包。正文表格中的 star、语言和归档状态保留自 2026-09-03 的原稿采集快照；可定位的 GitHub 仓库同时接入本站构建期仓库卡片，访客浏览页面时不会额外请求 GitHub API。

> [!NOTE]
> 头图：[Daniil Komov](https://www.pexels.com/@dkomov/) 在 [Pexels](https://www.pexels.com/photo/modern-laptop-displaying-code-in-cozy-workspace-34803986/) 发布，文件以 `1920×1280` 分辨率保存到本站静态资源。

## 怎么读这份文档

每个章节先给一张速览表（图标、项目名、一句话定位、分级与原稿采集时的 star），方便快速筛选；随后保留逐条说明，并在可对应 GitHub 仓库的条目前插入本站的构建期仓库卡片。

**分级口径**（按 star 规模 + 生态位，不是质量评价）：

| 标记   | 含义                         | 量级      |
| ------ | ---------------------------- | --------- |
| `T0`   | 生态基建，技术选型基本绕不开 | ≥ 80k     |
| `T1`   | 细分方向主力，可放心用于生产 | 10k – 80k |
| `T2`   | 场景特化，用之前先看维护状态 | 1k – 10k  |
| `观察` | 新建或长尾，看实现思路为主   | < 1k      |

**图标来源**：`https://github.com/<owner>.png?size=128`，即该仓库所属 owner 的 GitHub 原始头像，并非另行收集的素材。头像图片需要联网加载。

:::tip[阅读建议]
先用速览表按技术栈和场景筛选；准备采用时，再看仓库卡片中的构建期元数据与下方的适用场景、亮点和注意事项。
:::

**目录**

1. [液态玻璃与毛玻璃拟态](#一液态玻璃与毛玻璃拟态)
2. [创意组件集合与动效组件库](#二创意组件集合与动效组件库)
3. [动画与交互引擎](#三动画与交互引擎)
4. [无限画布与实验性交互](#四无限画布与实验性交互)
5. [AI 应用界面](#五ai-应用界面)
6. [设计系统与组件库](#六设计系统与组件库)
7. [状态管理与表单](#七状态管理与表单)
8. [工程化工具链](#八工程化工具链)
9. [数据可视化](#九数据可视化)
10. [AI 编码与前端技能包](#十ai-编码与前端技能包)

---

## 一、液态玻璃与毛玻璃拟态

Apple Liquid Glass 这套视觉语言 2025 年随 iOS 26 铺开，Web 侧的开源实现几乎都是 2026 年上半年才建的仓。这一节里除了 `liquid-glass-js`，其余 star 都在两位数以下，没有经过生产验证。建议当实现参考读，不要直接挂到线上业务。

### 速览

|                                                                       | 项目                           | 定位                             | 分级   | Star |
| --------------------------------------------------------------------- | ------------------------------ | -------------------------------- | ------ | ---- |
| <img src="https://github.com/dashersw.png?size=128" width="24" />     | `dashersw/liquid-glass-js`     | 原生 JS 的玻璃效果层，无框架依赖 | `观察` | 802  |
| <img src="https://github.com/glincker.png?size=128" width="24" />     | `glincker/glinui`              | React 液态玻璃组件库，50+ 组件   | `观察` | 34   |
| <img src="https://github.com/JUNGHERZ.png?size=128" width="24" />     | `JUNGHERZ/GlassKit`            | 纯 CSS 玻璃组件库，0 依赖        | `观察` | 12   |
| <img src="https://github.com/akilakeshara.png?size=128" width="24" /> | `akilakeshara/zentak-glass-ui` | 玻璃质感的业务模块组件           | `观察` | 6    |
| <img src="https://github.com/xiaojiaenen.png?size=128" width="24" />  | `xiaojiaenen/liquid-glass`     | SVG 滤镜做真折射的中文项目       | `观察` | 1    |
| <img src="https://github.com/YanAndFish.png?size=128" width="24" />   | `YanAndFish/liquid-glass`      | Vue 3 厚透镜玻璃组件             | `观察` | 1    |

### 卡片

::github{repo="dashersw/liquid-glass-js"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/dashersw.png?size=128" width="48" alt="liquid-glass-js" /></td>
<td valign="top">
<p><strong>dashersw/liquid-glass-js</strong> &nbsp;·&nbsp; ★ 802 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2025-06-11</p>
<p>把 Apple 那套液态玻璃搬到原生 DOM 上，不绑框架。</p>
<ul>
<li><b>功能</b>：给任意 HTML 元素叠一层玻璃效果，可调模糊半径、饱和度、折射强度、边缘高光。</li>
<li><b>场景</b>：官网 Hero 区、悬浮卡片、需要在老项目里临时加质感的页面。</li>
<li><b>亮点</b>：Vanilla JS，CDN 引一行就能用；MIT 许可，代码量小，适合直接读实现。</li>
<li><b>注意</b>：接口返回的最后推送时间是 2025-06-12，之后没有新提交。当参考实现用。</li>
</ul>
<p><a href="https://github.com/dashersw/liquid-glass-js">github.com/dashersw/liquid-glass-js</a></p>
</td>
</tr>
</table>

::github{repo="glincker/glinui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/glincker.png?size=128" width="48" alt="glinui" /></td>
<td valign="top">
<p><strong>glincker/glinui</strong> &nbsp;·&nbsp; ★ 34 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-02-14</p>
<p>React 生态里组件最全的液态玻璃库，站在 Radix + Tailwind 上面。</p>
<ul>
<li><b>功能</b>：50+ 组件，覆盖多层玻璃表面、光影层级、motion 过渡；既能 shadcn 式复制源码，也能装 npm 包。</li>
<li><b>场景</b>：仪表盘、AI 控制台、深色为主的后台界面。</li>
<li><b>亮点</b>：这一节里唯一走完整组件库路线的项目，深色模式处理得比较细；最近更新 2026-09-01，还在维护。</li>
<li><b>注意</b>：建仓半年，API 稳定性没有保障。</li>
</ul>
<p><a href="https://github.com/glincker/glinui">github.com/glincker/glinui</a></p>
</td>
</tr>
</table>

::github{repo="JUNGHERZ/GlassKit"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/JUNGHERZ.png?size=128" width="48" alt="GlassKit" /></td>
<td valign="top">
<p><strong>JUNGHERZ/GlassKit</strong> &nbsp;·&nbsp; ★ 12 &nbsp;·&nbsp; <code>HTML</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-03-21</p>
<p>visionOS / iOS 26 风格的纯 CSS 组件库，一个 CSS 文件搞定。</p>
<ul>
<li><b>功能</b>：24 个组件，全部靠 class 驱动；另提供 Web Component 封装（GlassKit Elements）；浅色/深色主题走 CSS 变量切换。</li>
<li><b>场景</b>：Astro / 静态站、不想引入 JS 的展示型页面。</li>
<li><b>亮点</b>：零依赖，主题的定制入口是 design token，改变量就能整站换风格；作者另做了配套 Astro 模板。</li>
<li><b>注意</b>：仓库 tag 里写了 no-dependencies，代价是交互态（拖拽、手势）基本没有。</li>
</ul>
<p><a href="https://github.com/JUNGHERZ/GlassKit">github.com/JUNGHERZ/GlassKit</a></p>
</td>
</tr>
</table>

::github{repo="akilakeshara/zentak-glass-ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/akilakeshara.png?size=128" width="48" alt="zentak-glass-ui" /></td>
<td valign="top">
<p><strong>akilakeshara/zentak-glass-ui</strong> &nbsp;·&nbsp; ★ 6 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-03-19</p>
<p>玻璃风格的成套业务组件，不是原子组件。</p>
<ul>
<li><b>功能</b>：滑动登录门户、悬浮导航、带动画的购物按钮、玻璃质感上传组件。</li>
<li><b>场景</b>：需要整块业务模块直接搬的落地页、活动页。</li>
<li><b>亮点</b>：粒度比组件库大，复制下来改文案就能跑。</li>
<li><b>注意</b>：star 个位数，代码质量和可访问性需要自己过一遍。</li>
</ul>
<p><a href="https://github.com/akilakeshara/zentak-glass-ui">github.com/akilakeshara/zentak-glass-ui</a></p>
</td>
</tr>
</table>

::github{repo="xiaojiaenen/liquid-glass"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/xiaojiaenen.png?size=128" width="48" alt="liquid-glass" /></td>
<td valign="top">
<p><strong>xiaojiaenen/liquid-glass</strong> &nbsp;·&nbsp; ★ 1 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-06-11</p>
<p>中文项目，用 SVG 滤镜做真折射而不是简单 blur。</p>
<ul>
<li><b>功能</b>：基于 SVG 滤镜模拟 Snell 折射与镜面高光；36 个组件覆盖导航、表单、反馈、展示；参数按黄金分割取值；鼠标视差反光。</li>
<li><b>场景</b>：追求折射物理感的官网、需要中文文档的项目。</li>
<li><b>亮点</b>：Safari / Firefox 上自动降级成毛玻璃，这个处理在同赛道里少见；零运行时依赖，只要 React 18+。</li>
<li><b>注意</b>：1 star，纯个人项目。</li>
</ul>
<p><a href="https://github.com/xiaojiaenen/liquid-glass">github.com/xiaojiaenen/liquid-glass</a></p>
</td>
</tr>
</table>

::github{repo="YanAndFish/liquid-glass"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/YanAndFish.png?size=128" width="48" alt="liquid-glass" /></td>
<td valign="top">
<p><strong>YanAndFish/liquid-glass</strong> &nbsp;·&nbsp; ★ 1 &nbsp;·&nbsp; <code>Vue</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2025-12-18</p>
<p>Vue 3 的厚透镜玻璃组件。</p>
<ul>
<li><b>功能</b>：可调折射率、边缘透镜环、边缘高光；内置调试面板实时调参。</li>
<li><b>场景</b>：Vue 技术栈的展示型页面。</li>
<li><b>亮点</b>：这一节里唯一的 Vue 实现，调试面板让参数摸索成本低不少。</li>
<li><b>注意</b>：仓库自述写的是通用 UI 组件库，液态玻璃只是其中一部分；1 star。</li>
</ul>
<p><a href="https://github.com/YanAndFish/liquid-glass">github.com/YanAndFish/liquid-glass</a></p>
</td>
</tr>
</table>

---

## 二、创意组件集合与动效组件库

这一类是「复制粘贴型」资源：不装依赖，把组件源码拷进项目自己维护。适合官网、落地页这类对视觉要求高、对长期维护要求相对低的场景。

### 速览

|                                                                        | 项目                    | 定位                                     | 分级 | Star   |
| ---------------------------------------------------------------------- | ----------------------- | ---------------------------------------- | ---- | ------ |
| <img src="https://github.com/magicuidesign.png?size=128" width="24" /> | `magicuidesign/magicui` | React 动效组件库，150+ 组件              | `T1` | 22,144 |
| <img src="https://github.com/uiverse-io.png?size=128" width="24" />    | `uiverse-io/galaxy`     | 社区 UI 元素合集，输出 HTML/CSS/Tailwind | `T1` | 12,273 |
| <img src="https://github.com/aceternity.png?size=128" width="24" />    | Aceternity UI           | 官网动效组件，只有站点没有主仓库         | —    | —      |

### 卡片

::github{repo="magicuidesign/magicui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/magicuidesign.png?size=128" width="48" alt="magicui" /></td>
<td valign="top">
<p><strong>magicuidesign/magicui</strong> &nbsp;·&nbsp; ★ 22,144 &nbsp;·&nbsp; <code>MDX</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-06-26</p>
<p>shadcn 路线的动效组件库，拿 CLI 一条命令装进项目。</p>
<ul>
<li><b>功能</b>：150+ 组件，覆盖光束、粒子背景、渐变边框、文字动效、滚动微交互；底层是 Framer Motion + Tailwind。</li>
<li><b>场景</b>：SaaS 官网、产品落地页、需要在两天内做出「有设计感」的界面。</li>
<li><b>亮点</b>：源码进你自己的仓库，组件想改就改，没有版本升级的绑架；open issue 只有 2 个，维护状态在这一类里算干净。</li>
<li><b>注意</b>：组件偏视觉，业务组件（表格、表单）不在范围内。</li>
</ul>
<p><a href="https://github.com/magicuidesign/magicui">github.com/magicuidesign/magicui</a></p>
</td>
</tr>
</table>

::github{repo="uiverse-io/galaxy"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/uiverse-io.png?size=128" width="48" alt="galaxy" /></td>
<td valign="top">
<p><strong>uiverse-io/galaxy</strong> &nbsp;·&nbsp; ★ 12,273 &nbsp;·&nbsp; <code>HTML</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-10-01</p>
<p>Uiverse.io 的官方仓库，社区投稿的 UI 元素大合集。</p>
<ul>
<li><b>功能</b>：霓虹、渐变、悬浮、异形按钮、卡片动效等元素，可切换输出 HTML / CSS / Tailwind / React 代码。</li>
<li><b>场景</b>：需要一个具体组件（比如一个好看的开关、一个 3D 按钮）时来这里翻。</li>
<li><b>亮点</b>：量最大，社区投稿持续在加；四种代码输出格式，跨技术栈可用。</li>
<li><b>注意</b>：原 <code>uiverse-io/uiverse</code> 已 404，现在只认 galaxy 这个仓库。社区稿件质量参差，复制前先自己跑一遍。</li>
</ul>
<p><a href="https://github.com/uiverse-io/galaxy">github.com/uiverse-io/galaxy</a></p>
</td>
</tr>
</table>

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/aceternity.png?size=128" width="48" alt="Aceternity UI" /></td>
<td valign="top">
<p><strong>Aceternity UI</strong> &nbsp;·&nbsp; 官方站点，无单一主仓库</p>
<p>官网动效组件的标杆级站点，只提供 copy-paste 源码。</p>
<ul>
<li><b>功能</b>：3D 卡片、流光按钮、spotlight 聚光、移动边框、星尘背景等 100+ 组件，基于 Framer Motion + Tailwind。</li>
<li><b>场景</b>：高质感官网、产品发布页。</li>
<li><b>亮点</b>：组件源码直接在站点上展开复制，另外提供面向 LLM 的组件目录，可以喂给 AI 编码助手。</li>
<li><b>注意</b>：没有统一仓库，也就没有版本管理和 issue 跟踪。本条不参与 star 分级。</li>
</ul>
<p><a href="https://ui.aceternity.com">ui.aceternity.com</a></p>
</td>
</tr>
</table>

---

## 三、动画与交互引擎

按「要什么效果」选：CSS 类切换用 animate.css，补间和时序用 anime / GSAP，React 声明式用 motion，滚动叙事用 GSAP ScrollTrigger，3D 用 three.js 全家桶，平滑滚动用 Lenis。

### 速览

|                                                                              | 项目                          | 定位                                    | 分级 | Star    |
| ---------------------------------------------------------------------------- | ----------------------------- | --------------------------------------- | ---- | ------- |
| <img src="https://github.com/animate-css.png?size=128" width="24" />         | `animate-css/animate.css`     | 纯 CSS 动画类库                         | `T0` | 82,775  |
| <img src="https://github.com/juliangarnier.png?size=128" width="24" />       | `juliangarnier/anime`         | 轻量 JS 补间动画引擎                    | `T1` | 72,615  |
| <img src="https://github.com/mrdoob.png?size=128" width="24" />              | `mrdoob/three.js`             | WebGL 3D 引擎                           | `T0` | 115,047 |
| <img src="https://github.com/airbnb.png?size=128" width="24" />              | `airbnb/lottie-web`           | 渲染 AE 导出的 Lottie JSON              | `T1` | 32,074  |
| <img src="https://github.com/motiondivision.png?size=128" width="24" />      | `motiondivision/motion`       | React / JS 动效库（Framer Motion 现名） | `T1` | 33,459  |
| <img src="https://github.com/greensock.png?size=128" width="24" />           | `greensock/GSAP`              | 时间线动画引擎 + ScrollTrigger          | `T1` | 28,199  |
| <img src="https://github.com/pmndrs.png?size=128" width="24" />              | `pmndrs/react-three-fiber`    | three.js 的 React 渲染器                | `T1` | 31,950  |
| <img src="https://github.com/VincentGarreau.png?size=128" width="24" />      | `VincentGarreau/particles.js` | 粒子背景                                | `T1` | 30,205  |
| <img src="https://github.com/michalsnik.png?size=128" width="24" />          | `michalsnik/aos`              | 滚动入场动画                            | `T1` | 28,057  |
| <img src="https://github.com/darkroomengineering.png?size=128" width="24" /> | `darkroomengineering/lenis`   | 平滑滚动                                | `T1` | 15,673  |
| <img src="https://github.com/pmndrs.png?size=128" width="24" />              | `pmndrs/drei`                 | react-three-fiber 辅助工具集            | `T2` | 9,839   |

### 卡片

::github{repo="animate-css/animate.css"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/animate-css.png?size=128" width="48" alt="animate.css" /></td>
<td valign="top">
<p><strong>animate-css/animate.css</strong> &nbsp;·&nbsp; ★ 82,775 &nbsp;·&nbsp; <code>CSS</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2011-10-12</p>
<p>一个 CSS 文件 + 一行 class，把淡入、弹跳、翻转全包了。</p>
<ul>
<li><b>功能</b>：几十个预置关键帧动画类，加 class 即触发，支持自定义 duration / delay / repeat。</li>
<li><b>场景</b>：后台系统的提示动效、活动页的元素入场、不想写 JS 的任何地方。</li>
<li><b>亮点</b>：fork 数是这一节里最高的（15,915），说明大量项目在改它；纯 CSS，零 JS 依赖。</li>
<li><b>注意</b>：本轮修正地址 —— 正确的 owner 是 <code>animate-css</code>，原文档写的 <code>animate.css/animate.css</code> 返回 404。</li>
</ul>
<p><a href="https://github.com/animate-css/animate.css">github.com/animate-css/animate.css</a></p>
</td>
</tr>
</table>

::github{repo="juliangarnier/anime"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/juliangarnier.png?size=128" width="48" alt="anime" /></td>
<td valign="top">
<p><strong>juliangarnier/anime</strong> &nbsp;·&nbsp; ★ 72,615 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2016-03-13</p>
<p>API 极简的 JS 补间引擎，适合写时序动画。</p>
<ul>
<li><b>功能</b>：CSS 属性、SVG、DOM 属性、JS 对象的补间；时间线、stagger、easing、keyframes。</li>
<li><b>场景</b>：图标变形、数据图表的入场、小体量的序列动画。</li>
<li><b>亮点</b>：体积远小于 GSAP，链式 API 读起来顺；不需要构建工具，script 标签直接引。</li>
<li><b>注意</b>：没有官方的滚动联动插件，做 scroll-driven 动画要自己接 IntersectionObserver。</li>
</ul>
<p><a href="https://github.com/juliangarnier/anime">github.com/juliangarnier/anime</a></p>
</td>
</tr>
</table>

::github{repo="mrdoob/three.js"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/mrdoob.png?size=128" width="48" alt="three.js" /></td>
<td valign="top">
<p><strong>mrdoob/three.js</strong> &nbsp;·&nbsp; ★ 115,047 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2010-03-23</p>
<p>Web 端 3D 的入口，其他 3D 库基本都站在它上面。</p>
<ul>
<li><b>功能</b>：场景图、相机、光照、材质、后处理、加载器（glTF / OBJ / FBX）；同时支持 WebGL、WebGL2、WebGPU。</li>
<li><b>场景</b>：产品 3D 展示、Web 游戏、数据可视化的三维表达、首页背景特效。</li>
<li><b>亮点</b>：fork 36,517，生态和案例数量没有对手；仓库 topics 里已包含 webgpu，渲染后端在往新标准迁。</li>
<li><b>注意</b>：API 面很大，直接手写成本高，React 项目一般走 react-three-fiber。</li>
</ul>
<p><a href="https://github.com/mrdoob/three.js">github.com/mrdoob/three.js</a></p>
</td>
</tr>
</table>

::github{repo="motiondivision/motion"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/motiondivision.png?size=128" width="48" alt="motion" /></td>
<td valign="top">
<p><strong>motiondivision/motion</strong> &nbsp;·&nbsp; ★ 33,459 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2018-11-16</p>
<p>Framer Motion 改名后的仓库，React 动效的默认选项。</p>
<ul>
<li><b>功能</b>：spring 物理动画、layout 动画（元素位置变化自动补间）、手势（drag / hover / tap）、AnimatePresence 出场动画、滚动联动。</li>
<li><b>场景</b>：React 项目里几乎所有交互态过渡，尤其是列表增删、路由切换、拖拽排序。</li>
<li><b>亮点</b>：layout 动画几乎无解 —— 用 CSS 手写同样效果要处理 FLIP，这里一个 prop 解决；同时有 vanilla JS 版本，不限于 React。</li>
<li><b>注意</b>：open issue 108，包体积不小，只在乎首屏的站点要按需引入。</li>
</ul>
<p><a href="https://github.com/motiondivision/motion">github.com/motiondivision/motion</a></p>
</td>
</tr>
</table>

::github{repo="greensock/GSAP"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/greensock.png?size=128" width="48" alt="GSAP" /></td>
<td valign="top">
<p><strong>greensock/GSAP</strong> &nbsp;·&nbsp; ★ 28,199 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2012-09-21</p>
<p>时间线模型最成熟的动画平台，做 award 级官网的主力。</p>
<ul>
<li><b>功能</b>：Timeline 精确编排、ScrollTrigger 滚动驱动、SplitText 文字拆分、MorphSVG 路径变形、Draggable。</li>
<li><b>场景</b>：长页面的滚动叙事、需要逐帧编排的复杂动效、SVG 路径动画。</li>
<li><b>亮点</b>：时间线可以嵌套、反转、seek，这一点是 anime 和 CSS 动画给不了的；框架无关，同一套代码在 React / Vue / 原生里都能跑。</li>
<li><b>注意</b>：插件体系的授权方式变过几次，商用前请自己到官网确认当前条款，别信二手信息。</li>
</ul>
<p><a href="https://github.com/greensock/GSAP">github.com/greensock/GSAP</a></p>
</td>
</tr>
</table>

::github{repo="airbnb/lottie-web"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/airbnb.png?size=128" width="48" alt="lottie-web" /></td>
<td valign="top">
<p><strong>airbnb/lottie-web</strong> &nbsp;·&nbsp; ★ 32,074 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2015-02-20</p>
<p>把 After Effects 动画原样搬到网页上。</p>
<ul>
<li><b>功能</b>：解析并渲染 AE 通过 Bodymovin 导出的 JSON；支持 SVG / Canvas / HTML 三种渲染器，可控制播放进度、速度、片段。</li>
<li><b>场景</b>：品牌吉祥物动画、空状态插画、加载动画、营销页里设计师给的高保真动效。</li>
<li><b>亮点</b>：设计与开发的交接成本最低 —— 设计师出 JSON，前端一行接入，不用还原关键帧。</li>
<li><b>注意</b>：open issue 857，且复杂的 AE 效果（表达式、部分滤镜）导出来会失真，前期要和设计师对齐可用范围。</li>
</ul>
<p><a href="https://github.com/airbnb/lottie-web">github.com/airbnb/lottie-web</a></p>
</td>
</tr>
</table>

::github{repo="pmndrs/react-three-fiber"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/pmndrs.png?size=128" width="48" alt="react-three-fiber" /></td>
<td valign="top">
<p><strong>pmndrs/react-three-fiber</strong> &nbsp;·&nbsp; ★ 31,950 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2019-02-25</p>
<p>用 JSX 写 three.js，把 3D 场景变成组件树。</p>
<ul>
<li><b>功能</b>：three.js 的 React 渲染器，声明式描述 mesh / 材质 / 光源；自动处理 resize、dispose、渲染循环。</li>
<li><b>场景</b>：React 项目里的 3D 官网、产品配置器、数据三维可视化。</li>
<li><b>亮点</b>：状态直接驱动 3D，不需要手动写命令式的 <code>scene.add()</code>；配套 drei 工具集把常用模式都封装好了。</li>
<li><b>注意</b>：底层仍是 three.js，性能问题和 WebGL 兼容性问题一个都不会少。</li>
</ul>
<p><a href="https://github.com/pmndrs/react-three-fiber">github.com/pmndrs/react-three-fiber</a></p>
</td>
</tr>
</table>

::github{repo="pmndrs/drei"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/pmndrs.png?size=128" width="48" alt="drei" /></td>
<td valign="top">
<p><strong>pmndrs/drei</strong> &nbsp;·&nbsp; ★ 9,839 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T2</code> &nbsp;·&nbsp; 建仓 2020-04-26</p>
<p>react-three-fiber 的官方辅助库，用 R3F 就该一起装。</p>
<ul>
<li><b>功能</b>：相机控制（OrbitControls）、加载器封装、环境光照、性能自适应（AdaptiveDpr）、文字、后处理快捷组件等一堆 helpers 和 hooks。</li>
<li><b>场景</b>：任何 R3F 项目的起步阶段。</li>
<li><b>亮点</b>：省掉大量样板代码，比如轨道控制器、GLTF 加载的 loading 状态管理。</li>
<li><b>注意</b>：跟着 R3F 版本走，跨大版本升级时 API 有变动。</li>
</ul>
<p><a href="https://github.com/pmndrs/drei">github.com/pmndrs/drei</a></p>
</td>
</tr>
</table>

::github{repo="VincentGarreau/particles.js"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/VincentGarreau.png?size=128" width="48" alt="particles.js" /></td>
<td valign="top">
<p><strong>VincentGarreau/particles.js</strong> &nbsp;·&nbsp; ★ 30,205 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2014-09-06</p>
<p>星云 / 连线 / 漂浮粒子背景，配置文件驱动。</p>
<ul>
<li><b>功能</b>：粒子数量、颜色、连线、悬停交互（grab / bubble / repulse）、点击喷发，全部走 JSON 配置。</li>
<li><b>场景</b>：官网 Hero 背景、登录页氛围层、技术类博客头部。</li>
<li><b>亮点</b>：fork 4,816，配置即效果，不用写一行 JS；体积很小。</li>
<li><b>注意</b>：open issue 367，维护节奏慢；粒子数上千时会掉帧，移动端要降配。</li>
</ul>
<p><a href="https://github.com/VincentGarreau/particles.js">github.com/VincentGarreau/particles.js</a></p>
</td>
</tr>
</table>

::github{repo="michalsnik/aos"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/michalsnik.png?size=128" width="48" alt="aos" /></td>
<td valign="top">
<p><strong>michalsnik/aos</strong> &nbsp;·&nbsp; ★ 28,057 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2015-07-09</p>
<p>元素滚进视口时触发动画，零依赖。</p>
<ul>
<li><b>功能</b>：用 <code>data-aos</code> 属性声明动画类型、延迟、时长、触发位置，库自己监听滚动。</li>
<li><b>场景</b>：企业官网、介绍型长页面、文档站。</li>
<li><b>亮点</b>：接入成本接近零，加属性就行；不需要理解 IntersectionObserver。</li>
<li><b>注意</b>：open issue 374，且只做「进入视口播一次」这一种模式，pin 住元素做叙事要上 GSAP。</li>
</ul>
<p><a href="https://github.com/michalsnik/aos">github.com/michalsnik/aos</a></p>
</td>
</tr>
</table>

::github{repo="darkroomengineering/lenis"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/darkroomengineering.png?size=128" width="48" alt="lenis" /></td>
<td valign="top">
<p><strong>darkroomengineering/lenis</strong> &nbsp;·&nbsp; ★ 15,673 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2022-02-21</p>
<p>接管浏览器滚动，做出惯性平滑滚动。</p>
<ul>
<li><b>功能</b>：虚拟滚动实现平滑惯性、滚动吸附、滚动锁定；提供 React / Vue 适配，暴露 scroll 事件供动画库订阅。</li>
<li><b>场景</b>：和 GSAP ScrollTrigger 搭配做滚动叙事、作品集站点。</li>
<li><b>亮点</b>：不像早期的 smooth-scroll 库那样劫持原生行为导致可访问性崩坏，键盘和锚点跳转都能正常处理。</li>
<li><b>注意</b>：会改变用户的滚动手感，中后台系统不要加。</li>
</ul>
<p><a href="https://github.com/darkroomengineering/lenis">github.com/darkroomengineering/lenis</a></p>
</td>
</tr>
</table>

---

## 四、无限画布与实验性交互

### 速览

|                                                                     | 项目                    | 定位                         | 分级 | Star    |
| ------------------------------------------------------------------- | ----------------------- | ---------------------------- | ---- | ------- |
| <img src="https://github.com/excalidraw.png?size=128" width="24" /> | `excalidraw/excalidraw` | 手绘风白板，完整应用         | `T0` | 131,024 |
| <img src="https://github.com/tldraw.png?size=128" width="24" />     | `tldraw/tldraw`         | 无限画布 SDK                 | `T1` | 50,091  |
| <img src="https://github.com/jdan.png?size=128" width="24" />       | `jdan/98.css`           | Windows 98 复古 CSS 设计系统 | `T1` | 11,472  |
| <img src="https://github.com/kando-menu.png?size=128" width="24" /> | `kando-menu/kando`      | 饼状手势径向菜单             | `T2` | 6,288   |

### 卡片

::github{repo="excalidraw/excalidraw"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/excalidraw.png?size=128" width="48" alt="excalidraw" /></td>
<td valign="top">
<p><strong>excalidraw/excalidraw</strong> &nbsp;·&nbsp; ★ 131,024 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2020-01-02</p>
<p>手绘风格的无限白板，一个可直接嵌入的产品级应用。</p>
<ul>
<li><b>功能</b>：手绘渲染（rough.js）、形状与自由绘制、端到端加密协作、导出 PNG/SVG、以 npm 包形式嵌入自己的 React 应用。</li>
<li><b>场景</b>：团队协作白板、技术分享画图、作为自家产品的绘图模块嵌入。</li>
<li><b>亮点</b>：审美上有明确主张 —— 那种歪歪扭扭的手写感成了它的识别符号；编辑器代码是 Canvas 类应用少有的完整公开实现。</li>
<li><b>注意</b>：open issue 3,435，仓库很大，想读懂要挑模块看。</li>
</ul>
<p><a href="https://github.com/excalidraw/excalidraw">github.com/excalidraw/excalidraw</a></p>
</td>
</tr>
</table>

::github{repo="tldraw/tldraw"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/tldraw.png?size=128" width="48" alt="tldraw" /></td>
<td valign="top">
<p><strong>tldraw/tldraw</strong> &nbsp;·&nbsp; ★ 50,091 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-05-09</p>
<p>给你无限画布能力，而不是给你一个白板产品。</p>
<ul>
<li><b>功能</b>：画布引擎 + 形状系统 + 选择/变换交互，另有多人同步（sync）、自定义形状、持久化接口。</li>
<li><b>场景</b>：自研白板、流程图工具、设计工具、AI 画布类产品的底层。</li>
<li><b>亮点</b>：定位是 SDK，形状和工具都能扩展，这点比 excalidraw（偏成品）灵活；仓库 topics 直接标了 multiplayer / sync。</li>
<li><b>注意</b>：同步服务的商业化条款有门槛，商用前需要确认许可证范围。</li>
</ul>
<p><a href="https://github.com/tldraw/tldraw">github.com/tldraw/tldraw</a></p>
</td>
</tr>
</table>

::github{repo="jdan/98.css"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/jdan.png?size=128" width="48" alt="98.css" /></td>
<td valign="top">
<p><strong>jdan/98.css</strong> &nbsp;·&nbsp; ★ 11,472 &nbsp;·&nbsp; <code>CSS</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-04-17</p>
<p>一个 CSS 文件，把页面变成 Windows 98。</p>
<ul>
<li><b>功能</b>：按钮、窗口、标题栏、进度条、标签页、表单控件的 98 风格样式；带 3D 边框和经典灰配色。</li>
<li><b>场景</b>：复古主题站点、极客向项目、愚人节彩蛋页。</li>
<li><b>亮点</b>：纯 CSS 实现，没有图片资源，全部用 border 技巧画出立体边框。对做复古 UI 的人来说是现成的设计系统。</li>
<li><b>注意</b>：视觉优先，可访问性（对比度、焦点样式）需要自己补。</li>
</ul>
<p><a href="https://github.com/jdan/98.css">github.com/jdan/98.css</a></p>
</td>
</tr>
</table>

::github{repo="kando-menu/kando"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/kando-menu.png?size=128" width="48" alt="kando" /></td>
<td valign="top">
<p><strong>kando-menu/kando</strong> &nbsp;·&nbsp; ★ 6,288 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T2</code> &nbsp;·&nbsp; 建仓 2023-04-16</p>
<p>饼状手势菜单，按住拖一下就选中。</p>
<ul>
<li><b>功能</b>：径向（pie）菜单，支持鼠标手势轨迹识别、多级子菜单、菜单项自定义。</li>
<li><b>场景</b>：创意工具、画布类应用、需要高频操作入口的桌面端 Web 应用。</li>
<li><b>亮点</b>：手势记忆形成后操作速度比线性菜单快一个量级，这是它存在的理由；跨平台（Electron）。</li>
<li><b>注意</b>：仓库自述是桌面端菜单工具，Web 集成需要自己做适配层。</li>
</ul>
<p><a href="https://github.com/kando-menu/kando">github.com/kando-menu/kando</a></p>
</td>
</tr>
</table>

---

## 五、AI 应用界面

这一节大部分是「前后端完整的应用」，前端价值在于可以直接抄它的交互模式：流式输出、消息列表、工具调用展示、插件面板、多模型切换。

### 速览

|                                                                       | 项目                      | 定位                                     | 分级 | Star    |
| --------------------------------------------------------------------- | ------------------------- | ---------------------------------------- | ---- | ------- |
| <img src="https://github.com/langgenius.png?size=128" width="24" />   | `langgenius/dify`         | LLM 应用开发平台，可视化编排             | `T0` | 154,261 |
| <img src="https://github.com/open-webui.png?size=128" width="24" />   | `open-webui/open-webui`   | 自托管 AI 聊天前端                       | `T0` | 150,746 |
| <img src="https://github.com/lobehub.png?size=128" width="24" />      | `lobehub/lobehub`         | AI 聊天 / Agent 界面框架（原 lobe-chat） | `T0` | 82,175  |
| <img src="https://github.com/FlowiseAI.png?size=128" width="24" />    | `FlowiseAI/Flowise`       | 拖拽式 Agent 流程构建器 ⚠️ 已归档        | `T1` | 55,402  |
| <img src="https://github.com/danny-avila.png?size=128" width="24" />  | `danny-avila/LibreChat`   | 多模型聊天平台，类 ChatGPT               | `T1` | 42,740  |
| <img src="https://github.com/mckaywrigley.png?size=128" width="24" /> | `mckaywrigley/chatbot-ui` | AI 聊天 UI 模板                          | `T1` | 33,341  |
| <img src="https://github.com/wandb.png?size=128" width="24" />        | `wandb/openui`            | 自然语言描述生成 UI 原型                 | `T1` | 22,533  |
| <img src="https://github.com/thesysdev.png?size=128" width="24" />    | `thesysdev/openui`        | 生成式 UI 的开放标准                     | `T2` | 8,513   |

### 卡片

::github{repo="langgenius/dify"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/langgenius.png?size=128" width="48" alt="dify" /></td>
<td valign="top">
<p><strong>langgenius/dify</strong> &nbsp;·&nbsp; ★ 154,261 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2023-04-12</p>
<p>把 Agent 工作流、RAG、模型管理做成可视化工作台。</p>
<ul>
<li><b>功能</b>：工作流画布编排、知识库 / RAG 管线、工具与 MCP 接入、多模型供应商、发布为 API 或 Web App。</li>
<li><b>场景</b>：企业内部 AI 应用平台、需要非技术同事参与配置的场景。</li>
<li><b>亮点</b>：前端主线是 TypeScript（Next.js），工作流画布是基于节点的编辑器，这块实现值得单独读；部署形态覆盖云 / VPC / 自托管。</li>
<li><b>注意</b>：open issue 1,044，代码体量大，二次开发前先评估。</li>
</ul>
<p><a href="https://github.com/langgenius/dify">github.com/langgenius/dify</a></p>
</td>
</tr>
</table>

::github{repo="open-webui/open-webui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/open-webui.png?size=128" width="48" alt="open-webui" /></td>
<td valign="top">
<p><strong>open-webui/open-webui</strong> &nbsp;·&nbsp; ★ 150,746 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2023-10-06</p>
<p>自托管 AI 聊天界面，接 Ollama 或任何 OpenAI 兼容接口。</p>
<ul>
<li><b>功能</b>：多模型切换、内置 RAG、插件系统、主题定制、多用户与权限、MCP 支持。</li>
<li><b>场景</b>：本地大模型（Ollama）的日常使用界面、团队内部私有化部署的 AI 入口。</li>
<li><b>亮点</b>：fork 22,023 —— 大量人在它基础上改出自己的界面；插件体系让前端扩展不用改核心代码。</li>
<li><b>注意</b>：后端是 Python，前端是其一部分，纯前端项目想复用 UI 需要剥离后端耦合。</li>
</ul>
<p><a href="https://github.com/open-webui/open-webui">github.com/open-webui/open-webui</a></p>
</td>
</tr>
</table>

::github{repo="lobehub/lobehub"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/lobehub.png?size=128" width="48" alt="lobehub" /></td>
<td valign="top">
<p><strong>lobehub/lobehub</strong> &nbsp;·&nbsp; ★ 82,175 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2023-05-21</p>
<p>原 lobe-chat，本轮核验发现仓库已改名，定位从聊天框架升级为 Agent 调度台。</p>
<ul>
<li><b>功能</b>：多模型接入、插件 / Agent 市场、知识库（RAG）、多模态、一键私有化部署。</li>
<li><b>场景</b>：需要精致 UI 的自部署 AI 产品、想直接改出一个商业化聊天应用的团队。</li>
<li><b>亮点</b>：这个赛道里 UI 设计质量排前几位的项目，深色主题的完成度尤其高；纯 TypeScript 技术栈，前端可以直接读。</li>
<li><b>注意</b>：本轮修正地址 —— <code>lobehub/lobe-chat</code> 已 301 跳转到 <code>lobehub/lobehub</code>，仓库描述改为「Chief Agent Operator」。老链接还能访问，但新引用请用改名后的地址。</li>
</ul>
<p><a href="https://github.com/lobehub/lobehub">github.com/lobehub/lobehub</a></p>
</td>
</tr>
</table>

::github{repo="FlowiseAI/Flowise"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/FlowiseAI.png?size=128" width="48" alt="Flowise" /></td>
<td valign="top">
<p><strong>FlowiseAI/Flowise</strong> &nbsp;·&nbsp; ★ 55,402 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; ⚠️ 已归档</p>
<p>拖拽式 Agent / RAG 流程构建器，自带完整前端控制台。</p>
<ul>
<li><b>功能</b>：节点式画布编排 Agent 流程、内置 RAG 与工具节点、把流程发布成 API 或嵌入组件。</li>
<li><b>场景</b>：快速搭 AI 应用原型、做 PoC 演示。</li>
<li><b>亮点</b>：fork 24,970，节点画布的交互实现可以参考；TypeScript 全栈。</li>
<li><b>注意</b>：<b>接口返回 archived = true</b>，仓库已进入归档状态，不再接受新 issue 和 PR。可以 fork 出来自己维护，别指望上游修 bug。</li>
</ul>
<p><a href="https://github.com/FlowiseAI/Flowise">github.com/FlowiseAI/Flowise</a></p>
</td>
</tr>
</table>

::github{repo="danny-avila/LibreChat"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/danny-avila.png?size=128" width="48" alt="LibreChat" /></td>
<td valign="top">
<p><strong>danny-avila/LibreChat</strong> &nbsp;·&nbsp; ★ 42,740 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-02-12</p>
<p>功能铺得最全的开源 ChatGPT 替代品之一。</p>
<ul>
<li><b>功能</b>：多模型与多供应商切换、Agents、MCP、Artifacts、代码解释器、文件上传与 RAG、多用户鉴权、预设（Presets）。</li>
<li><b>场景</b>：团队共享的 AI 聊天服务、需要多用户与权限管理的自托管场景。</li>
<li><b>亮点</b>：仓库描述里把支持面列得很细（DeepSeek / Anthropic / Azure / Vertex / OpenRouter 等），覆盖面在这一节里最广；Docker 一键起。</li>
<li><b>注意</b>：open issue 725，功能多也意味着配置面大。</li>
</ul>
<p><a href="https://github.com/danny-avila/LibreChat">github.com/danny-avila/LibreChat</a></p>
</td>
</tr>
</table>

::github{repo="mckaywrigley/chatbot-ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/mckaywrigley.png?size=128" width="48" alt="chatbot-ui" /></td>
<td valign="top">
<p><strong>mckaywrigley/chatbot-ui</strong> &nbsp;·&nbsp; ★ 33,341 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-03-11</p>
<p>小而完整的 AI 聊天 UI，适合当学习模板。</p>
<ul>
<li><b>功能</b>：Next.js 实现的聊天界面，消息流、模型切换、对话管理、Markdown 渲染。</li>
<li><b>场景</b>：学习 AI 前端交互结构、作为自研聊天应用的起点。</li>
<li><b>亮点</b>：代码量比上面几个平台小一个数量级，能把流式输出的完整链路读完。</li>
<li><b>注意</b>：功能面窄，插件、Agent、RAG 这些没有。</li>
</ul>
<p><a href="https://github.com/mckaywrigley/chatbot-ui">github.com/mckaywrigley/chatbot-ui</a></p>
</td>
</tr>
</table>

::github{repo="wandb/openui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/wandb.png?size=128" width="48" alt="openui" /></td>
<td valign="top">
<p><strong>wandb/openui</strong> &nbsp;·&nbsp; ★ 22,533 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2024-03-17</p>
<p>用一句话描述界面，实时渲染出可编辑的原型。</p>
<ul>
<li><b>功能</b>：自然语言生成 UI 并实时预览；输出 HTML / React（Tailwind）代码；支持接本地 Ollama，也接云端模型。</li>
<li><b>场景</b>：需求评审前快速出视觉稿、验证布局想法、给非技术同事演示。</li>
<li><b>亮点</b>：本地可跑，数据不出内网；生成结果能直接导出成代码接着改。</li>
<li><b>注意</b>：生成结果需要人工返工，别当最终产物。</li>
</ul>
<p><a href="https://github.com/wandb/openui">github.com/wandb/openui</a></p>
</td>
</tr>
</table>

::github{repo="thesysdev/openui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/thesysdev.png?size=128" width="48" alt="openui" /></td>
<td valign="top">
<p><strong>thesysdev/openui</strong> &nbsp;·&nbsp; ★ 8,513 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T2</code> &nbsp;·&nbsp; 建仓 2024-12-02</p>
<p>注意和上面那个 openui 不是同一个东西：这个是「生成式 UI 的协议标准」。</p>
<ul>
<li><b>功能</b>：定义一套面向流式传输的紧凑 DSL，配套渲染框架，让服务端直接返回 UI 描述而非 Markdown 文本。</li>
<li><b>场景</b>：Agent 产品里让模型直接输出可交互界面，而不是只输出文字。</li>
<li><b>亮点</b>：押的是「Prompt 即 App」这条路线，思路比工具本身更有参考价值。</li>
<li><b>注意</b>：open issue 147，仓库描述里挂着 looking-for-contributors，标准仍在演进。</li>
</ul>
<p><a href="https://github.com/thesysdev/openui">github.com/thesysdev/openui</a></p>
</td>
</tr>
</table>

---

## 六、设计系统与组件库

分三块看：国际通用底座、中文生态、图标资源。

### 6.1 国际通用底座

|                                                                       | 项目                       | 定位                          | 分级 | Star    |
| --------------------------------------------------------------------- | -------------------------- | ----------------------------- | ---- | ------- |
| <img src="https://github.com/shadcn-ui.png?size=128" width="24" />    | `shadcn-ui/ui`             | 复制粘贴式组件底座            | `T0` | 122,828 |
| <img src="https://github.com/tailwindlabs.png?size=128" width="24" /> | `tailwindlabs/tailwindcss` | 原子化 CSS 框架               | `T0` | 97,435  |
| <img src="https://github.com/saadeghi.png?size=128" width="24" />     | `saadeghi/daisyui`         | Tailwind 组件库 + 主题系统    | `T1` | 42,272  |
| <img src="https://github.com/chakra-ui.png?size=128" width="24" />    | `chakra-ui/chakra-ui`      | 以设计 token 为核心的组件系统 | `T1` | 40,615  |
| <img src="https://github.com/mantinedev.png?size=128" width="24" />   | `mantinedev/mantine`       | 全功能 React 组件库 + Hooks   | `T1` | 31,657  |
| <img src="https://github.com/tailwindlabs.png?size=128" width="24" /> | `tailwindlabs/headlessui`  | 无样式可访问组件（React/Vue） | `T1` | 28,732  |
| <img src="https://github.com/TanStack.png?size=128" width="24" />     | `TanStack/table`           | 无头表格 / 数据网格           | `T1` | 28,400  |
| <img src="https://github.com/radix-ui.png?size=128" width="24" />     | `radix-ui/primitives`      | 无样式可访问原语              | `T1` | 19,232  |
| <img src="https://github.com/unocss.png?size=128" width="24" />       | `unocss/unocss`            | 即时按需原子化 CSS 引擎       | `T1` | 18,946  |
| <img src="https://github.com/mui.png?size=128" width="24" />          | `mui/base-ui`              | 无头组件库（MUI 出品）        | `T1` | 10,801  |

### 6.2 中文生态

|                                                                       | 项目                        | 定位                     | 分级 | Star   |
| --------------------------------------------------------------------- | --------------------------- | ------------------------ | ---- | ------ |
| <img src="https://github.com/ant-design.png?size=128" width="24" />   | `ant-design/ant-design`     | 企业级 React UI 库       | `T0` | 99,363 |
| <img src="https://github.com/element-plus.png?size=128" width="24" /> | `element-plus/element-plus` | Vue 3 UI 库              | `T1` | 27,729 |
| <img src="https://github.com/youzan.png?size=128" width="24" />       | `youzan/vant`               | 移动端 Vue UI 库         | `T1` | 24,383 |
| <img src="https://github.com/tusen-ai.png?size=128" width="24" />     | `tusen-ai/naive-ui`         | Vue 3 组件库，主题可定制 | `T1` | 18,525 |

### 6.3 图标资源

|                                                                       | 项目                  | 定位                   | 分级 | Star   |
| --------------------------------------------------------------------- | --------------------- | ---------------------- | ---- | ------ |
| <img src="https://github.com/lucide-icons.png?size=128" width="24" /> | `lucide-icons/lucide` | 开源图标集，覆盖多框架 | `T1` | 24,300 |

### 卡片

::github{repo="shadcn-ui/ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/shadcn-ui.png?size=128" width="48" alt="ui" /></td>
<td valign="top">
<p><strong>shadcn-ui/ui</strong> &nbsp;·&nbsp; ★ 122,828 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2023-01-04</p>
<p>不发布的组件库：代码拷进你的仓库，从此归你所有。</p>
<ul>
<li><b>功能</b>：一套基于 Radix + Tailwind 的组件源码分发平台，CLI 按需添加；覆盖 React / Vue / Svelte 等多个框架目标。</li>
<li><b>场景</b>：任何需要自建设计系统的 React 项目；做特化 UI 的起点。</li>
<li><b>亮点</b>：绕开了「组件库版本升级打破自定义样式」这个老问题 —— 你改的是自己的代码；生态里大量衍生库（magicui、tremor 等）都建立在它之上。</li>
<li><b>注意</b>：本轮修正 —— 正确的地址是 <code>shadcn-ui/ui</code>，老的 <code>shadcn-ui/shadcn-ui</code> 已失效。open issue 2,045，规模大，issue 多属正常。</li>
</ul>
<p><a href="https://github.com/shadcn-ui/ui">github.com/shadcn-ui/ui</a></p>
</td>
</tr>
</table>

::github{repo="tailwindlabs/tailwindcss"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/tailwindlabs.png?size=128" width="48" alt="tailwindcss" /></td>
<td valign="top">
<p><strong>tailwindlabs/tailwindcss</strong> &nbsp;·&nbsp; ★ 97,435 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2017-10-06</p>
<p>原子化 CSS，现在做 UI 定制绕不开的基础设施。</p>
<ul>
<li><b>功能</b>：utility class 体系、响应式前缀、状态变体、任意值语法、插件扩展；v4 起配置更多走 CSS 变量。</li>
<li><b>场景</b>：几乎所有新项目；尤其适合需要精细控制、不接受组件库默认样式的场景。</li>
<li><b>亮点</b>：整个 shadcn 生态、daisyUI 生态都建立在它之上，学一次到处能用；open issue 只有 62，维护很紧。</li>
<li><b>注意</b>：HTML 里 class 会变长，团队需要约定组织方式，否则模板很快失控。</li>
</ul>
<p><a href="https://github.com/tailwindlabs/tailwindcss">github.com/tailwindlabs/tailwindcss</a></p>
</td>
</tr>
</table>

::github{repo="ant-design/ant-design"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/ant-design.png?size=128" width="48" alt="ant-design" /></td>
<td valign="top">
<p><strong>ant-design/ant-design</strong> &nbsp;·&nbsp; ★ 99,363 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2015-04-24</p>
<p>中文生态里最完整的企业级 React 组件库。</p>
<ul>
<li><b>功能</b>：100+ 组件，覆盖表单、表格、树、上传、日期等中后台全套；设计语言 + 主题定制（design token）；国际化。</li>
<li><b>场景</b>：企业内部系统、管理后台、B 端产品。</li>
<li><b>亮点</b>：fork 54,709 —— 中文项目里被复制改造最多的仓库之一；中后台场景几乎不需要自己造组件。</li>
<li><b>注意</b>：默认视觉偏「企业风」，做消费者产品或特化 UI 时 override 成本较高。</li>
</ul>
<p><a href="https://github.com/ant-design/ant-design">github.com/ant-design/ant-design</a></p>
</td>
</tr>
</table>

::github{repo="saadeghi/daisyui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/saadeghi.png?size=128" width="48" alt="daisyui" /></td>
<td valign="top">
<p><strong>saadeghi/daisyui</strong> &nbsp;·&nbsp; ★ 42,272 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-11-28</p>
<p>Tailwind 之上的组件层，靠主题变量整套换风格。</p>
<ul>
<li><b>功能</b>：语义化 class（btn、card、modal）、数十套内置主题、组件级样式定制。</li>
<li><b>场景</b>：想用 Tailwind 又不想手写一堆 utility 的项目、需要快速切换主题的产品。</li>
<li><b>亮点</b>：自带主题系统，改几个 CSS 变量就能整站换皮；不限于 React，任何用 Tailwind 的栈都能使。</li>
<li><b>注意</b>：open issue 只有 42，维护状态好；代价是样式定制深度不如直接写 Tailwind。</li>
</ul>
<p><a href="https://github.com/saadeghi/daisyui">github.com/saadeghi/daisyui</a></p>
</td>
</tr>
</table>

::github{repo="chakra-ui/chakra-ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/chakra-ui.png?size=128" width="48" alt="chakra-ui" /></td>
<td valign="top">
<p><strong>chakra-ui/chakra-ui</strong> &nbsp;·&nbsp; ★ 40,615 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2019-08-17</p>
<p>以设计 token 为骨架的组件系统，定制体验顺滑。</p>
<ul>
<li><b>功能</b>：组件 + 样式 props + 主题 token 体系，深色模式与响应式开箱可用；底层已改用 Ark UI 原语。</li>
<li><b>场景</b>：SaaS 产品、需要把品牌规范落到 token 上的团队。</li>
<li><b>亮点</b>：样式写在 props 里（<code>&lt;Box p={4} bg="blue.500"&gt;</code>），改一处 token 全站生效。</li>
<li><b>注意</b>：open issue 只有 14，但样式 props 的运行时开销比 utility class 高，超大列表场景要留意。</li>
</ul>
<p><a href="https://github.com/chakra-ui/chakra-ui">github.com/chakra-ui/chakra-ui</a></p>
</td>
</tr>
</table>

::github{repo="mantinedev/mantine"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/mantinedev.png?size=128" width="48" alt="mantine" /></td>
<td valign="top">
<p><strong>mantinedev/mantine</strong> &nbsp;·&nbsp; ★ 31,657 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-01-07</p>
<p>组件数量与 Hooks 数量都管够的 React 库。</p>
<ul>
<li><b>功能</b>：100+ 组件 + 一整套 Hooks（useDisclosure、useForm、useLocalStorage 等）；内置深浅色主题、通知系统、富文本与日期处理。</li>
<li><b>场景</b>：想少装第三方依赖的 React 项目、后台与前台通吃的中型产品。</li>
<li><b>亮点</b>：Hooks 层是它的差异化 —— 很多原本要引独立库的能力这里直接给了；open issue 只有 51。</li>
<li><b>注意</b>：绑定 React，其他框架用不了。</li>
</ul>
<p><a href="https://github.com/mantinedev/mantine">github.com/mantinedev/mantine</a></p>
</td>
</tr>
</table>

::github{repo="tailwindlabs/headlessui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/tailwindlabs.png?size=128" width="48" alt="headlessui" /></td>
<td valign="top">
<p><strong>tailwindlabs/headlessui</strong> &nbsp;·&nbsp; ★ 28,732 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-09-16</p>
<p>只给交互逻辑和可访问性，样式全交给你。</p>
<ul>
<li><b>功能</b>：Dialog、Menu、Listbox、Combobox、Tabs、Disclosure 等无样式组件；React 与 Vue 双版本。</li>
<li><b>场景</b>：用 Tailwind 且需要完全控制外观的项目。</li>
<li><b>亮点</b>：Tailwind 官方维护，和 utility class 的配合是天生的；焦点管理、ARIA 属性、键盘导航都处理好了。</li>
<li><b>注意</b>：组件覆盖面比 Radix 窄，复杂组件（如 Data Grid）没有。</li>
</ul>
<p><a href="https://github.com/tailwindlabs/headlessui">github.com/tailwindlabs/headlessui</a></p>
</td>
</tr>
</table>

::github{repo="TanStack/table"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/TanStack.png?size=128" width="48" alt="table" /></td>
<td valign="top">
<p><strong>TanStack/table</strong> &nbsp;·&nbsp; ★ 28,400 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2016-10-20</p>
<p>表格逻辑与 UI 彻底分离，复杂表格的通用底座。</p>
<ul>
<li><b>功能</b>：排序、筛选、分组、分页、列宽调整、行选择、虚拟滚动适配；React / Vue / Solid / Svelte 多框架适配层。</li>
<li><b>场景</b>：数据密集型后台、报表系统、任何「表格不止展示」的场景。</li>
<li><b>亮点</b>：无头设计意味着表格长什么样完全由你定，配 shadcn 的 Table 组件是常见组合。</li>
<li><b>注意</b>：本轮修正大小写 —— owner 的正式写法是 <code>TanStack</code>，不是 <code>tanstack</code>（GitHub 会容错，但引用时写对更好）。</li>
</ul>
<p><a href="https://github.com/TanStack/table">github.com/TanStack/table</a></p>
</td>
</tr>
</table>

::github{repo="radix-ui/primitives"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/radix-ui.png?size=128" width="48" alt="primitives" /></td>
<td valign="top">
<p><strong>radix-ui/primitives</strong> &nbsp;·&nbsp; ★ 19,232 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-06-19</p>
<p>无样式、可访问性达标的 React 原语，shadcn 的底层依赖。</p>
<ul>
<li><b>功能</b>：Dialog、Dropdown、Popover、Tooltip、Select、Slider、Tabs 等 30+ 原语，键盘导航与 ARIA 完整。</li>
<li><b>场景</b>：自建设计系统、对可访问性有硬要求的政企项目。</li>
<li><b>亮点</b>：可访问性这一块是它最值钱的部分，自己实现一遍的代价远高于引它。</li>
<li><b>注意</b>：仓库描述写明现在由 WorkOS 维护（"Maintained by @workos"），治理方有变化。</li>
</ul>
<p><a href="https://github.com/radix-ui/primitives">github.com/radix-ui/primitives</a></p>
</td>
</tr>
</table>

::github{repo="unocss/unocss"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/unocss.png?size=128" width="48" alt="unocss" /></td>
<td valign="top">
<p><strong>unocss/unocss</strong> &nbsp;·&nbsp; ★ 18,946 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-09-30</p>
<p>按需生成、零预扫描的原子化 CSS 引擎。</p>
<ul>
<li><b>功能</b>：presets 体系（可拼装 Tailwind / Windi 兼容规则）、自定义规则、图标 preset、属性化模式（attributify）。</li>
<li><b>场景</b>：对构建速度敏感的大项目、需要自定义原子规则的设计系统。</li>
<li><b>亮点</b>：引擎化设计，规则可插拔，比固定语法的方案灵活；Vite 集成成熟。</li>
<li><b>注意</b>：生态与第三方组件预设比 Tailwind 少，团队要有能力自己维护 preset。</li>
</ul>
<p><a href="https://github.com/unocss/unocss">github.com/unocss/unocss</a></p>
</td>
</tr>
</table>

::github{repo="mui/base-ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/mui.png?size=128" width="48" alt="base-ui" /></td>
<td valign="top">
<p><strong>mui/base-ui</strong> &nbsp;·&nbsp; ★ 10,801 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2024-02-23</p>
<p>MUI 团队做的无头组件库，Radix 之外的另一个选项。</p>
<ul>
<li><b>功能</b>：无样式组件 + 完整可访问性，覆盖弹层、选择、表单等交互原语。</li>
<li><b>场景</b>：想摆脱 Material 视觉、又要 MUI 团队维护质量的项目。</li>
<li><b>亮点</b>：仓库描述写明由 Radix、Floating UI、Material UI 的同一批作者打造，浮层定位这块继承 Floating UI 的能力。</li>
<li><b>注意</b>：建仓 2024 年，open issue 426，比 Radix 年轻，API 仍在调整。</li>
</ul>
<p><a href="https://github.com/mui/base-ui">github.com/mui/base-ui</a></p>
</td>
</tr>
</table>

::github{repo="element-plus/element-plus"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/element-plus.png?size=128" width="48" alt="element-plus" /></td>
<td valign="top">
<p><strong>element-plus/element-plus</strong> &nbsp;·&nbsp; ★ 27,729 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-07-21</p>
<p>Vue 3 生态里最常用的企业级组件库。</p>
<ul>
<li><b>功能</b>：表格、表单、树、上传、日期时间等后台全套组件；TypeScript 重写，支持按需引入与主题定制。</li>
<li><b>场景</b>：Vue 技术栈的中后台系统。</li>
<li><b>亮点</b>：fork 19,837，中文文档和社区问答最全，遇到问题基本搜得到。</li>
<li><b>注意</b>：open issue 1,189，视觉风格同样偏企业化。</li>
</ul>
<p><a href="https://github.com/element-plus/element-plus">github.com/element-plus/element-plus</a></p>
</td>
</tr>
</table>

::github{repo="youzan/vant"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/youzan.png?size=128" width="48" alt="vant" /></td>
<td valign="top">
<p><strong>youzan/vant</strong> &nbsp;·&nbsp; ★ 24,383 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2017-04-19</p>
<p>轻量移动端 Vue 组件库。</p>
<ul>
<li><b>功能</b>：60+ 移动组件（下拉刷新、省市区选择、图片预览、步进器、SKU 选择等）；支持深色模式与主题定制。</li>
<li><b>场景</b>：H5 活动页、移动端商城、小程序同构方案。</li>
<li><b>亮点</b>：fork 9,386，移动场景的组件粒度拿捏得准（比如 SKU 选择这种电商专属组件）。</li>
<li><b>注意</b>：面向移动端，桌面端后台不合适。</li>
</ul>
<p><a href="https://github.com/youzan/vant">github.com/youzan/vant</a></p>
</td>
</tr>
</table>

::github{repo="tusen-ai/naive-ui"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/tusen-ai.png?size=128" width="48" alt="naive-ui" /></td>
<td valign="top">
<p><strong>tusen-ai/naive-ui</strong> &nbsp;·&nbsp; ★ 18,525 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-06-04</p>
<p>Vue 3 组件库里主题定制最自由的一个。</p>
<ul>
<li><b>功能</b>：90+ 组件，全量 TypeScript；主题通过 <code>n-config-provider</code> 的 theme overrides 逐 token 覆盖。</li>
<li><b>场景</b>：需要贴合自家品牌色的 Vue 3 项目。</li>
<li><b>亮点</b>：没有用 CSS 预处理器，主题系统是运行时的，换主题不用重新构建。</li>
<li><b>注意</b>：open issue 700，组件数量略少于 Element Plus。</li>
</ul>
<p><a href="https://github.com/tusen-ai/naive-ui">github.com/tusen-ai/naive-ui</a></p>
</td>
</tr>
</table>

::github{repo="lucide-icons/lucide"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/lucide-icons.png?size=128" width="48" alt="lucide" /></td>
<td valign="top">
<p><strong>lucide-icons/lucide</strong> &nbsp;·&nbsp; ★ 24,300 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2020-06-08</p>
<p>Feather Icons 的社区续作，统一线宽的图标集。</p>
<ul>
<li><b>功能</b>：1000+ 图标，提供 React / Vue / Svelte / Angular 等框架包，也可作为纯 SVG 或图标字体使用。</li>
<li><b>场景</b>：任何需要图标的项目，尤其是和 shadcn / Tailwind 搭配时。</li>
<li><b>亮点</b>：所有图标共用 24×24 网格与统一描边宽度，混排不会视觉打架；tree-shaking 友好。</li>
<li><b>注意</b>：风格统一也意味着个性化弱，品牌图标得另做。</li>
</ul>
<p><a href="https://github.com/lucide-icons/lucide">github.com/lucide-icons/lucide</a></p>
</td>
</tr>
</table>

---

## 七、状态管理与表单

上一版文档缺了这块，但对日常开发的影响比多数 UI 库都直接。

### 速览

|                                                                          | 项目                              | 定位                 | 分级 | Star   |
| ------------------------------------------------------------------------ | --------------------------------- | -------------------- | ---- | ------ |
| <img src="https://github.com/pmndrs.png?size=128" width="24" />          | `pmndrs/zustand`                  | React 轻量状态管理   | `T1` | 58,637 |
| <img src="https://github.com/TanStack.png?size=128" width="24" />        | `TanStack/query`                  | 服务端状态与数据获取 | `T1` | 50,252 |
| <img src="https://github.com/react-hook-form.png?size=128" width="24" /> | `react-hook-form/react-hook-form` | 表单状态与校验       | `T1` | 44,845 |

### 卡片

::github{repo="pmndrs/zustand"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/pmndrs.png?size=128" width="48" alt="zustand" /></td>
<td valign="top">
<p><strong>pmndrs/zustand</strong> &nbsp;·&nbsp; ★ 58,637 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2019-04-09</p>
<p>一个 Hook 就是一个 store，不需要 Provider 包裹。</p>
<ul>
<li><b>功能</b>：create 建 store、selector 精确订阅、中间件（persist / devtools / immer）、可脱离 React 在组件外读写。</li>
<li><b>场景</b>：中小型 React 应用的全局状态、跨组件共享的 UI 状态。</li>
<li><b>亮点</b>：样板代码量比 Redux Toolkit 少一个量级；open issue 只有 5，稳定度很高。</li>
<li><b>注意</b>：没有强制的状态更新规范，大团队需要自己立规矩，否则 store 容易变成杂物间。</li>
</ul>
<p><a href="https://github.com/pmndrs/zustand">github.com/pmndrs/zustand</a></p>
</td>
</tr>
</table>

::github{repo="TanStack/query"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/TanStack.png?size=128" width="48" alt="query" /></td>
<td valign="top">
<p><strong>TanStack/query</strong> &nbsp;·&nbsp; ★ 50,252 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2019-09-10</p>
<p>把「服务端数据」当成一个独立问题来解决。</p>
<ul>
<li><b>功能</b>：请求缓存与失效、stale-while-revalidate、自动重试、分页 / 无限滚动、乐观更新、请求去重；React / Vue / Solid / Svelte 适配层。</li>
<li><b>场景</b>：任何有接口调用的应用，尤其是列表 + 详情 + 编辑这类典型后台。</li>
<li><b>亮点</b>：用了之后大部分「请求状态」相关的 useState / useEffect 都可以删掉；缓存失效策略设计得比手写方案完整。</li>
<li><b>注意</b>：心智模型需要转换（缓存 key 的设计是核心），团队上手有学习成本。</li>
</ul>
<p><a href="https://github.com/TanStack/query">github.com/TanStack/query</a></p>
</td>
</tr>
</table>

::github{repo="react-hook-form/react-hook-form"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/react-hook-form.png?size=128" width="48" alt="react-hook-form" /></td>
<td valign="top">
<p><strong>react-hook-form/react-hook-form</strong> &nbsp;·&nbsp; ★ 44,845 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2019-03-05</p>
<p>非受控方案的表单库，靠减少重渲染换性能。</p>
<ul>
<li><b>功能</b>：字段注册、校验（内置 + zod / yup resolver）、错误状态、数组字段、表单监听；Web 与 React Native 通用。</li>
<li><b>场景</b>：字段多的复杂表单、对输入流畅度有要求的场景。</li>
<li><b>亮点</b>：字段输入不触发整表重渲染，这是它和受控表单方案的根本差异；open issue 只有 6，非常稳定。</li>
<li><b>注意</b>：非受控模型意味着拿值要靠 watch / getValues，习惯了受控写法的同学需要适应。</li>
</ul>
<p><a href="https://github.com/react-hook-form/react-hook-form">github.com/react-hook-form/react-hook-form</a></p>
</td>
</tr>
</table>

---

## 八、工程化工具链

### 速览

|                                                                      | 项目                    | 定位                           | 分级 | Star   |
| -------------------------------------------------------------------- | ----------------------- | ------------------------------ | ---- | ------ |
| <img src="https://github.com/microsoft.png?size=128" width="24" />   | `microsoft/playwright`  | 跨浏览器 E2E 测试与自动化      | `T0` | 95,542 |
| <img src="https://github.com/storybookjs.png?size=128" width="24" /> | `storybookjs/storybook` | 组件开发工作台                 | `T0` | 90,985 |
| <img src="https://github.com/vitejs.png?size=128" width="24" />      | `vitejs/vite`           | 构建工具与开发服务器           | `T0` | 82,658 |
| <img src="https://github.com/evanw.png?size=128" width="24" />       | `evanw/esbuild`         | Go 写的极速打包器              | `T1` | 40,033 |
| <img src="https://github.com/swc-project.png?size=128" width="24" /> | `swc-project/swc`       | Rust 转译器 / 压缩器           | `T1` | 34,189 |
| <img src="https://github.com/vercel.png?size=128" width="24" />      | `vercel/turborepo`      | 前端 monorepo 构建编排         | `T1` | 31,044 |
| <img src="https://github.com/biomejs.png?size=128" width="24" />     | `biomejs/biome`         | Rust 写的 lint + format 工具链 | `T1` | 25,701 |
| <img src="https://github.com/oxc-project.png?size=128" width="24" /> | `oxc-project/oxc`       | Rust JS/TS 工具链合集          | `T1` | 22,611 |
| <img src="https://github.com/vitest-dev.png?size=128" width="24" />  | `vitest-dev/vitest`     | Vite 原生测试框架              | `T1` | 17,040 |

### 卡片

::github{repo="microsoft/playwright"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/microsoft.png?size=128" width="48" alt="playwright" /></td>
<td valign="top">
<p><strong>microsoft/playwright</strong> &nbsp;·&nbsp; ★ 95,542 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2019-11-15</p>
<p>一套 API 跑 Chromium / Firefox / WebKit，E2E 和 UI 回归都靠它。</p>
<ul>
<li><b>功能</b>：多浏览器自动化、自动等待元素、网络拦截与 mock、trace 回放、视觉对比截图、并行执行、组件测试。</li>
<li><b>场景</b>：E2E 测试、UI 回归、截图比对、需要登录态的复杂流程验证。</li>
<li><b>亮点</b>：自动等待把「flaky 测试」这个老大难问题解决了大半；trace viewer 能回放失败用例的每一步，排查效率比看日志高得多。</li>
<li><b>注意</b>：首次安装要下载浏览器二进制，国内网络需要配镜像源。</li>
</ul>
<p><a href="https://github.com/microsoft/playwright">github.com/microsoft/playwright</a></p>
</td>
</tr>
</table>

::github{repo="storybookjs/storybook"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/storybookjs.png?size=128" width="48" alt="storybook" /></td>
<td valign="top">
<p><strong>storybookjs/storybook</strong> &nbsp;·&nbsp; ★ 90,985 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2016-03-18</p>
<p>把组件从应用里拎出来单独开发、文档化和测试。</p>
<ul>
<li><b>功能</b>：stories 隔离开发、addon 生态（a11y、controls、docs、viewport）、交互测试、视觉测试集成；覆盖 React / Vue / Svelte / Angular / Web Components。</li>
<li><b>场景</b>：组件库建设、设计系统落地、需要与设计师对齐组件状态的团队。</li>
<li><b>亮点</b>：多框架支持是它的护城河 —— 技术栈混杂的大厂尤其需要；Vite 构建支持已经就位。</li>
<li><b>注意</b>：open issue 1,792，配置复杂，小项目可能不划算。</li>
</ul>
<p><a href="https://github.com/storybookjs/storybook">github.com/storybookjs/storybook</a></p>
</td>
</tr>
</table>

::github{repo="vitejs/vite"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/vitejs.png?size=128" width="48" alt="vite" /></td>
<td valign="top">
<p><strong>vitejs/vite</strong> &nbsp;·&nbsp; ★ 82,658 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2020-04-21</p>
<p>新项目的默认构建方案，冷启动和 HMR 是它的立身之本。</p>
<ul>
<li><b>功能</b>：基于原生 ESM 的开发服务器、毫秒级 HMR、Rollup 兼容的生产构建、插件体系（兼容 Rollup 插件）。</li>
<li><b>场景</b>：几乎所有前端新项目；也是 Vitest、Storybook、UnoCSS 等工具的公共底座。</li>
<li><b>亮点</b>：生态位已经稳了 —— 周边工具基本都以「支持 Vite」为前提设计，这个网络效应是它最强的部分。</li>
<li><b>注意</b>：open issue 765；超大 monorepo 里开发服务器的首次依赖预构建仍可能变慢。</li>
</ul>
<p><a href="https://github.com/vitejs/vite">github.com/vitejs/vite</a></p>
</td>
</tr>
</table>

::github{repo="evanw/esbuild"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/evanw.png?size=128" width="48" alt="esbuild" /></td>
<td valign="top">
<p><strong>evanw/esbuild</strong> &nbsp;·&nbsp; ★ 40,033 &nbsp;·&nbsp; <code>Go</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2016-06-14</p>
<p>Go 写的打包器，快到改变了整个工具链的预期。</p>
<ul>
<li><b>功能</b>：JS / TS / JSX 打包与转译、CSS 打包、压缩、tree-shaking、sourcemap；可作库调用也可 CLI 使用。</li>
<li><b>场景</b>：自己写构建脚本、库打包、需要极致构建速度的场景。</li>
<li><b>亮点</b>：Vite 开发期就靠它做依赖预构建和转译；单进程 Go 的并发设计让它的速度比 JS 实现的 bundler 高一个数量级。</li>
<li><b>注意</b>：插件 API 不如 Rollup / Webpack 灵活，复杂构建流程一般还是交给上层框架。</li>
</ul>
<p><a href="https://github.com/evanw/esbuild">github.com/evanw/esbuild</a></p>
</td>
</tr>
</table>

::github{repo="swc-project/swc"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/swc-project.png?size=128" width="48" alt="swc" /></td>
<td valign="top">
<p><strong>swc-project/swc</strong> &nbsp;·&nbsp; ★ 34,189 &nbsp;·&nbsp; <code>Rust</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2017-12-22</p>
<p>Rust 实现的转译与压缩平台，Babel 的高性能替代。</p>
<ul>
<li><b>功能</b>：TS / JSX 转译、语法降级（按 targets 输出）、压缩、模块打包实验支持、插件系统。</li>
<li><b>场景</b>：需要替换 Babel 提速的存量项目、框架底层（Next.js 等）。</li>
<li><b>亮点</b>：多数时候你不用直接引它 —— 它通过 Next.js、Parcel 等框架间接服务你；真需要自己接时，配置模型比 Babel 简单。</li>
<li><b>注意</b>：插件生态（尤其自定义 Babel 插件）需要重写成 Rust 或走 wasm，迁移不是无痛的。</li>
</ul>
<p><a href="https://github.com/swc-project/swc">github.com/swc-project/swc</a></p>
</td>
</tr>
</table>

::github{repo="vercel/turborepo"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/vercel.png?size=128" width="48" alt="turborepo" /></td>
<td valign="top">
<p><strong>vercel/turborepo</strong> &nbsp;·&nbsp; ★ 31,044 &nbsp;·&nbsp; <code>Rust</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-10-05</p>
<p>monorepo 的任务编排器，靠增量缓存省 CI 时间。</p>
<ul>
<li><b>功能</b>：任务依赖图编排、本地与远程缓存、按包过滤执行、并行调度。</li>
<li><b>场景</b>：多包仓库（组件库 + 应用 + 文档站）、CI 构建耗时过长的团队。</li>
<li><b>亮点</b>：接入成本比 Nx / Lerna 低，主要就是一份 turbo.json；open issue 只有 15，维护状态很稳。</li>
<li><b>注意</b>：远程缓存的免费额度有限制，团队规模上去后要算成本。</li>
</ul>
<p><a href="https://github.com/vercel/turborepo">github.com/vercel/turborepo</a></p>
</td>
</tr>
</table>

::github{repo="biomejs/biome"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/biomejs.png?size=128" width="48" alt="biome" /></td>
<td valign="top">
<p><strong>biomejs/biome</strong> &nbsp;·&nbsp; ★ 25,701 &nbsp;·&nbsp; <code>Rust</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-07-27</p>
<p>一个二进制替代 ESLint + Prettier，零配置起步。</p>
<ul>
<li><b>功能</b>：格式化（JS / TS / JSX / JSON / CSS）、lint 规则、import 排序，同时提供 LSP。</li>
<li><b>场景</b>：新项目直接上；受够了 ESLint 配置套娃和 Prettier 冲突的老项目。</li>
<li><b>亮点</b>：Rust 实现，全量 lint 通常在毫秒级完成；单一配置文件，不用在多个插件版本之间调停。</li>
<li><b>注意</b>：自定义规则生态远不如 ESLint，依赖大量社区插件的项目迁移会受阻。</li>
</ul>
<p><a href="https://github.com/biomejs/biome">github.com/biomejs/biome</a></p>
</td>
</tr>
</table>

::github{repo="oxc-project/oxc"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/oxc-project.png?size=128" width="48" alt="oxc" /></td>
<td valign="top">
<p><strong>oxc-project/oxc</strong> &nbsp;·&nbsp; ★ 22,611 &nbsp;·&nbsp; <code>Rust</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-02-09</p>
<p>JS / TS 工具链的 Rust 零件箱，被上层工具大量集成。</p>
<ul>
<li><b>功能</b>：Parser、linter（oxlint）、transformer、minifier、formatter 等组件，可单独取用。</li>
<li><b>场景</b>：工具链开发者；普通项目通常通过 oxlint 或框架间接使用。</li>
<li><b>亮点</b>：性能目标明确，oxlint 在多数仓库上能在 1 秒内跑完，常被用作 CI 的快速前置检查。</li>
<li><b>注意</b>：仍在快速演进（open issue 823），直接依赖底层 API 有 breaking change 风险。</li>
</ul>
<p><a href="https://github.com/oxc-project/oxc">github.com/oxc-project/oxc</a></p>
</td>
</tr>
</table>

::github{repo="vitest-dev/vitest"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/vitest-dev.png?size=128" width="48" alt="vitest" /></td>
<td valign="top">
<p><strong>vitest-dev/vitest</strong> &nbsp;·&nbsp; ★ 17,040 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2021-12-03</p>
<p>和 Vite 共用同一套配置与转换管道的测试框架。</p>
<ul>
<li><b>功能</b>：单元测试、组件测试、快照、覆盖率、并发执行、浏览器模式、类型测试；兼容 Jest 的多数 API。</li>
<li><b>场景</b>：Vite 项目的首选单测方案。</li>
<li><b>亮点</b>：复用 Vite 的 config 和插件，意味着你为构建写的 alias、环境变量、TSX 转换在测试里直接生效，不用再配一遍 Jest 的 transform。</li>
<li><b>注意</b>：open issue 376；从 Jest 迁移大体平顺，但部分高级 mock 行为有差异。</li>
</ul>
<p><a href="https://github.com/vitest-dev/vitest">github.com/vitest-dev/vitest</a></p>
</td>
</tr>
</table>

---

## 九、数据可视化

按可控程度排：d3 最自由也最难，G2 / visx 是原语层，ECharts / Chart.js / Recharts 是成品图表，Tremor 是仪表盘组件。

### 速览

|                                                                     | 项目                       | 定位                    | 分级 | Star    |
| ------------------------------------------------------------------- | -------------------------- | ----------------------- | ---- | ------- |
| <img src="https://github.com/d3.png?size=128" width="24" />         | `d3/d3`                    | 可视化底层原语          | `T0` | 113,601 |
| <img src="https://github.com/chartjs.png?size=128" width="24" />    | `chartjs/Chart.js`         | Canvas 图表，上手快     | `T1` | 67,676  |
| <img src="https://github.com/apache.png?size=128" width="24" />     | `apache/echarts`           | 国产全能图表库          | `T1` | 67,222  |
| <img src="https://github.com/recharts.png?size=128" width="24" />   | `recharts/recharts`        | React 声明式图表        | `T1` | 27,536  |
| <img src="https://github.com/airbnb.png?size=128" width="24" />     | `airbnb/visx`              | React 可视化原语集      | `T1` | 21,034  |
| <img src="https://github.com/apexcharts.png?size=128" width="24" /> | `apexcharts/apexcharts.js` | 交互式 SVG 图表         | `T1` | 15,144  |
| <img src="https://github.com/plouc.png?size=128" width="24" />      | `plouc/nivo`               | React 图表模板库        | `T1` | 14,091  |
| <img src="https://github.com/antvis.png?size=128" width="24" />     | `antvis/G2`                | 可视化语法（AntV 底层） | `T1` | 12,601  |
| <img src="https://github.com/tremorlabs.png?size=128" width="24" /> | `tremorlabs/tremor`        | 仪表盘 React 组件       | `T2` | 3,596   |

### 卡片

::github{repo="d3/d3"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/d3.png?size=128" width="48" alt="d3" /></td>
<td valign="top">
<p><strong>d3/d3</strong> &nbsp;·&nbsp; ★ 113,601 &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2010-09-27</p>
<p>不是图表库，是一套操作数据与 SVG / Canvas 的原语。</p>
<ul>
<li><b>功能</b>：比例尺、坐标轴、布局算法（力导向、树图、打包图）、路径生成器、数据连接（data join）、过渡、拖拽缩放。</li>
<li><b>场景</b>：设计稿里那个「不太标准」的图、需要完全自定义交互的可视化。</li>
<li><b>亮点</b>：上限最高 —— 市面上多数图表库只能画它能力的子集；fork 22,668，社区案例覆盖了二十年积累。</li>
<li><b>注意</b>：学习成本也是最高的。能用 ECharts 解决就别上 d3，这是省时间的建议。</li>
</ul>
<p><a href="https://github.com/d3/d3">github.com/d3/d3</a></p>
</td>
</tr>
</table>

::github{repo="chartjs/Chart.js"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/chartjs.png?size=128" width="48" alt="Chart.js" /></td>
<td valign="top">
<p><strong>chartjs/Chart.js</strong> &nbsp;·&nbsp; ★ 67,676 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2013-03-17</p>
<p>Canvas 渲染，配置项少，出图快。</p>
<ul>
<li><b>功能</b>：折线、柱状、饼、雷达、极坐标、气泡、散点等 8 类基础图；响应式、图例、tooltip、动画。</li>
<li><b>场景</b>：后台概览页、博客插图、对图表要求不高的常规场景。</li>
<li><b>亮点</b>：上手成本最低，一个 config 对象就能出图；体积比 ECharts 小。</li>
<li><b>注意</b>：Canvas 渲染意味着图表内容无法被搜索引擎和屏幕阅读器读取，导出高质量 SVG 也不方便。</li>
</ul>
<p><a href="https://github.com/chartjs/Chart.js">github.com/chartjs/Chart.js</a></p>
</td>
</tr>
</table>

::github{repo="apache/echarts"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/apache.png?size=128" width="48" alt="echarts" /></td>
<td valign="top">
<p><strong>apache/echarts</strong> &nbsp;·&nbsp; ★ 67,222 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2013-04-03</p>
<p>Apache 顶级项目，中文生态里图表能力最全的一个。</p>
<ul>
<li><b>功能</b>：常规图表 + 地图、关系图、树图、桑基图、3D、GL 大数据量渲染；Canvas / SVG 双渲染器；主题与数据集（dataset）机制。</li>
<li><b>场景</b>：数据大屏、BI 系统、需要地图或关系图的业务。</li>
<li><b>亮点</b>：fork 19,813，中文文档质量高，国内遇到问题基本都能搜到；大数据量下有 progressive 渲染和 WebGL 方案兜底。</li>
<li><b>注意</b>：open issue 1,524；全量引入体积大，务必按需引入。</li>
</ul>
<p><a href="https://github.com/apache/echarts">github.com/apache/echarts</a></p>
</td>
</tr>
</table>

::github{repo="recharts/recharts"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/recharts.png?size=128" width="48" alt="recharts" /></td>
<td valign="top">
<p><strong>recharts/recharts</strong> &nbsp;·&nbsp; ★ 27,536 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2015-08-07</p>
<p>用 JSX 组件拼图表，React 项目里最自然的写法。</p>
<ul>
<li><b>功能</b>：LineChart / BarChart / AreaChart 等容器组件 + 子组件（XAxis、Tooltip、Legend）自由组合；底层基于 D3 的子模块。</li>
<li><b>场景</b>：React 后台的常规图表、需要和图例/tooltip 深度联动的场景。</li>
<li><b>亮点</b>：组合式 API 让「改一个轴的样式」这种需求不用翻庞大的 config 文档。</li>
<li><b>注意</b>：open issue 446，深度定制会撞到组件封装的天花板。</li>
</ul>
<p><a href="https://github.com/recharts/recharts">github.com/recharts/recharts</a></p>
</td>
</tr>
</table>

::github{repo="airbnb/visx"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/airbnb.png?size=128" width="48" alt="visx" /></td>
<td valign="top">
<p><strong>airbnb/visx</strong> &nbsp;·&nbsp; ★ 21,034 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2017-03-15</p>
<p>D3 的计算能力 + React 的渲染模型，中间的胶水层。</p>
<ul>
<li><b>功能</b>：把 D3 的 scale / shape / axis 等模块拆成 React 组件与 Hooks，你负责组合。</li>
<li><b>场景</b>：既想要 D3 的自由度、又不想让 D3 直接操作 DOM 的 React 项目。</li>
<li><b>亮点</b>：解决了「D3 和 React 争抢 DOM 控制权」这个经典矛盾 —— D3 只算，React 只画。</li>
<li><b>注意</b>：是原语不是图表，一个折线图也要自己拼 scale + shape + axis。</li>
</ul>
<p><a href="https://github.com/airbnb/visx">github.com/airbnb/visx</a></p>
</td>
</tr>
</table>

::github{repo="apexcharts/apexcharts.js"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/apexcharts.png?size=128" width="48" alt="apexcharts.js" /></td>
<td valign="top">
<p><strong>apexcharts/apexcharts.js</strong> &nbsp;·&nbsp; ★ 15,144 &nbsp;·&nbsp; <code>JavaScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2018-07-24</p>
<p>默认样式就挺好看的 SVG 交互图表库。</p>
<ul>
<li><b>功能</b>：折线 / 面积 / 柱状 / 雷达 / 烛台等图；缩放平移、数据点标注、动态更新、多轴；提供 React / Vue / Angular 封装。</li>
<li><b>场景</b>：金融类图表、需要缩放交互的时序数据、不想调样式的项目。</li>
<li><b>亮点</b>：SVG 渲染，可直接导出矢量图；交互（brush、zoom）开箱可用。</li>
<li><b>注意</b>：数据量上万时 SVG 节点数会成为瓶颈。</li>
</ul>
<p><a href="https://github.com/apexcharts/apexcharts.js">github.com/apexcharts/apexcharts.js</a></p>
</td>
</tr>
</table>

::github{repo="plouc/nivo"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/plouc.png?size=128" width="48" alt="nivo" /></td>
<td valign="top">
<p><strong>plouc/nivo</strong> &nbsp;·&nbsp; ★ 14,091 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2016-04-16</p>
<p>React 图表模板库，配置驱动，出图漂亮。</p>
<ul>
<li><b>功能</b>：20+ 图表类型（含桑基、和弦、热力图、雷达），支持 SVG / Canvas / HTML 渲染，内置动效与主题。</li>
<li><b>场景</b>：需要好看的复杂图表、又不想从 D3 写起。</li>
<li><b>亮点</b>：同构渲染（服务端也能出图）；open issue 只有 50，维护状态好。</li>
<li><b>注意</b>：定制深度受限于它的配置项，奇怪的需求实现不了。</li>
</ul>
<p><a href="https://github.com/plouc/nivo">github.com/plouc/nivo</a></p>
</td>
</tr>
</table>

::github{repo="antvis/G2"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/antvis.png?size=128" width="48" alt="G2" /></td>
<td valign="top">
<p><strong>antvis/G2</strong> &nbsp;·&nbsp; ★ 12,601 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2016-05-26</p>
<p>图形语法（Grammar of Graphics）的 AntV 实现。</p>
<ul>
<li><b>功能</b>：以「数据 → 标记 → 编码 → 标度 → 坐标系」的声明式语法描述图表；G2 5.x 支持 Canvas / SVG / WebGL 渲染。</li>
<li><b>场景</b>：需要非标准图表、或要在 AntV 生态（G6、L7、S2）内统一技术栈的团队。</li>
<li><b>亮点</b>：语法化的好处是图表类型不受枚举限制，组合能出官方没预设的图。</li>
<li><b>注意</b>：语法学习曲线陡；默认分支是 v5，与 4.x 的 API 不兼容，找资料时注意版本。</li>
</ul>
<p><a href="https://github.com/antvis/G2">github.com/antvis/G2</a></p>
</td>
</tr>
</table>

::github{repo="tremorlabs/tremor"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/tremorlabs.png?size=128" width="48" alt="tremor" /></td>
<td valign="top">
<p><strong>tremorlabs/tremor</strong> &nbsp;·&nbsp; ★ 3,596 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T2</code> &nbsp;·&nbsp; 建仓 2024-03-26</p>
<p>为仪表盘和 AI 产品做的复制型 React 组件。</p>
<ul>
<li><b>功能</b>：KPI 卡片、面积图、柱状图、进度条、表格等仪表盘组件，基于 Tailwind + Radix。</li>
<li><b>场景</b>：AI 产品的数据面板、内部指标看板。</li>
<li><b>亮点</b>：组件粒度是「一块看板」而不是「一个图表」，配 Tailwind 直接就能拼出完整页面。</li>
<li><b>注意</b>：3.6k star，规模小；建仓 2024 年，API 可能变动。</li>
</ul>
<p><a href="https://github.com/tremorlabs/tremor">github.com/tremorlabs/tremor</a></p>
</td>
</tr>
</table>

---

## 十、AI 编码与前端技能包

这一块是上一版新增的，本轮把地址全部重新核了一遍。

### 10.1 Agent 技能包（给 AI 编码助手装前端规范）

|                                                                         | 项目                               | 定位                        | 分级   | Star    |
| ----------------------------------------------------------------------- | ---------------------------------- | --------------------------- | ------ | ------- |
| <img src="https://github.com/anthropics.png?size=128" width="24" />     | `anthropics/skills`                | Anthropic 官方 Agent Skills | `T0`   | 173,277 |
| <img src="https://github.com/ComposioHQ.png?size=128" width="24" />     | `ComposioHQ/awesome-claude-skills` | Skills 精选清单             | `T1`   | 74,323  |
| <img src="https://github.com/greensock.png?size=128" width="24" />      | `greensock/gsap-skills`            | GSAP 官方 AI 技能包         | `T1`   | 14,826  |
| <img src="https://github.com/TerminalSkills.png?size=128" width="24" /> | `TerminalSkills/skills`            | 社区技能合集，含 UI 类      | `观察` | 143     |
| <img src="https://github.com/Sec-Dome.png?size=128" width="24" />       | `Sec-Dome/Awesome-Skills`          | 跨平台技能目录              | `观察` | 3       |

#### 卡片

::github{repo="anthropics/skills"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/anthropics.png?size=128" width="48" alt="skills" /></td>
<td valign="top">
<p><strong>anthropics/skills</strong> &nbsp;·&nbsp; ★ 173,277 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2025-09-22</p>
<p>Agent Skills 这个范式的官方参考实现。</p>
<ul>
<li><b>功能</b>：以 SKILL.md 为单位封装可复用能力，其中 <code>frontend-design</code>（前端设计规范）和 <code>webapp-testing</code>（浏览器测试）直接服务前端；支持 Claude Code 等主流 Agent。</li>
<li><b>场景</b>：让 AI 生成的代码符合你的设计规范，而不是每次都输出千篇一律的 Bootstrap 风。</li>
<li><b>亮点</b>：建仓不到一年拿到 17 万 star，是这轮统计里增长最快的仓库；把「团队规范」变成了机器可读的资产。</li>
<li><b>注意</b>：open issue 1,204，迭代很快；技能内容需要按自家技术栈裁剪。</li>
</ul>
<p><a href="https://github.com/anthropics/skills">github.com/anthropics/skills</a></p>
</td>
</tr>
</table>

::github{repo="ComposioHQ/awesome-claude-skills"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/ComposioHQ.png?size=128" width="48" alt="awesome-claude-skills" /></td>
<td valign="top">
<p><strong>ComposioHQ/awesome-claude-skills</strong> &nbsp;·&nbsp; ★ 74,323 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2025-10-17</p>
<p>社区 Skills 的分类索引。</p>
<ul>
<li><b>功能</b>：按文档处理、前端开发、测试等类目聚合社区技能，附来源链接。</li>
<li><b>场景</b>：想找现成技能时先来这儿翻，比逐个搜仓库省事。</li>
<li><b>亮点</b>：topics 里覆盖了 Claude Code / Codex / Gemini CLI / Cursor 等多个宿主，跨平台参考价值高。</li>
<li><b>注意</b>：本轮修正大小写 —— owner 正式写法是 <code>ComposioHQ</code>。清单型仓库，质量需要自己甄别。</li>
</ul>
<p><a href="https://github.com/ComposioHQ/awesome-claude-skills">github.com/ComposioHQ/awesome-claude-skills</a></p>
</td>
</tr>
</table>

::github{repo="greensock/gsap-skills"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/greensock.png?size=128" width="48" alt="gsap-skills" /></td>
<td valign="top">
<p><strong>greensock/gsap-skills</strong> &nbsp;·&nbsp; ★ 14,826 &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2026-03-04</p>
<p>GSAP 官方出的 AI 技能包，让 Agent 会写动画。</p>
<ul>
<li><b>功能</b>：教 AI 编码助手正确使用 GSAP，含最佳实践、常见动画模式、插件用法；覆盖 React / Vue / Svelte / 原生 JS。</li>
<li><b>场景</b>：用 AI 写动效代码时，避免它输出过时的 API 或错误的时间线写法。</li>
<li><b>亮点</b>：官方维护意味着内容与 GSAP 当前版本同步，这一点第三方技能包做不到。</li>
<li><b>注意</b>：仓库没有检测到主语言字段（纯文档 / 指令型仓库）。</li>
</ul>
<p><a href="https://github.com/greensock/gsap-skills">github.com/greensock/gsap-skills</a></p>
</td>
</tr>
</table>

::github{repo="TerminalSkills/skills"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/TerminalSkills.png?size=128" width="48" alt="skills" /></td>
<td valign="top">
<p><strong>TerminalSkills/skills</strong> &nbsp;·&nbsp; ★ 143 &nbsp;·&nbsp; <code>Shell</code> &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-02-02</p>
<p>社区技能合集，里面有 aceternity-ui、shadcn 这类前端专属技能。</p>
<ul>
<li><b>功能</b>：SKILL.md 形式的技能库，面向 Claude Code / Codex / Gemini CLI / Cursor。</li>
<li><b>场景</b>：想让 AI 直接产出高质感界面时，装载对应的 UI 技能。</li>
<li><b>亮点</b>：前端 UI 类技能占比高，这是它区别于泛化清单的地方。</li>
<li><b>注意</b>：143 star，社区规模小，技能质量靠自己验。</li>
</ul>
<p><a href="https://github.com/TerminalSkills/skills">github.com/TerminalSkills/skills</a></p>
</td>
</tr>
</table>

::github{repo="Sec-Dome/Awesome-Skills"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/Sec-Dome.png?size=128" width="48" alt="Awesome-Skills" /></td>
<td valign="top">
<p><strong>Sec-Dome/Awesome-Skills</strong> &nbsp;·&nbsp; ★ 3 &nbsp;·&nbsp; <code>观察</code> &nbsp;·&nbsp; 建仓 2026-01-24</p>
<p>跨平台的 Agent 技能目录。</p>
<ul>
<li><b>功能</b>：汇总可用于 Claude Code / Gemini CLI / Cursor 等宿主的技能清单。</li>
<li><b>场景</b>：和上面几个清单互为补充，多翻一个来源。</li>
<li><b>亮点</b>：覆盖的宿主种类较多。</li>
<li><b>注意</b>：实测只有 3 star，属于个人维护的起步项目，收录完整性有限。上一版文档把它列为主要推荐，本轮下调到观察级。</li>
</ul>
<p><a href="https://github.com/Sec-Dome/Awesome-Skills">github.com/Sec-Dome/Awesome-Skills</a></p>
</td>
</tr>
</table>

### 10.2 开源 AI 编码助手

|                                                                      | 项目                     | 定位                    | 分级 | Star    |
| -------------------------------------------------------------------- | ------------------------ | ----------------------- | ---- | ------- |
| <img src="https://github.com/anomalyco.png?size=128" width="24" />   | `anomalyco/opencode`     | 终端 AI 编码 Agent      | `T0` | 203,302 |
| <img src="https://github.com/anthropics.png?size=128" width="24" />  | `anthropics/claude-code` | Anthropic 官方 CLI 代理 | `T0` | 143,826 |
| <img src="https://github.com/openai.png?size=128" width="24" />      | `openai/codex`           | OpenAI 终端编码 Agent   | `T0` | 120,997 |
| <img src="https://github.com/OpenHands.png?size=128" width="24" />   | `OpenHands/OpenHands`    | 开源 AI 软件工程师      | `T0` | 85,999  |
| <img src="https://github.com/cline.png?size=128" width="24" />       | `cline/cline`            | VS Code 内的 AI 助手    | `T1` | 67,373  |
| <img src="https://github.com/Aider-AI.png?size=128" width="24" />    | `Aider-AI/aider`         | 终端结对编程，基于 git  | `T1` | 48,684  |
| <img src="https://github.com/continuedev.png?size=128" width="24" /> | `continuedev/continue`   | 可自托管的 AI 编码助手  | `T1` | 35,735  |

#### 卡片

::github{repo="anomalyco/opencode"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/anomalyco.png?size=128" width="48" alt="opencode" /></td>
<td valign="top">
<p><strong>anomalyco/opencode</strong> &nbsp;·&nbsp; ★ 203,302 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2025-04-30</p>
<p>终端里的开源编码 Agent，本轮统计中 star 最高的仓库。</p>
<ul>
<li><b>功能</b>：多模型接入、终端内完成代码读写与命令执行、会话与项目上下文管理、插件与配置扩展。</li>
<li><b>场景</b>：不想把代码交给闭源工具、又想要 Agent 能力的开发者。</li>
<li><b>亮点</b>：20 万 star 说明社区已经形成了插件和配置的生态；TypeScript 实现，前端开发者想改源码门槛低。</li>
<li><b>注意</b>：本轮修正地址 —— <code>sst/opencode</code> 已 301 跳转到 <code>anomalyco/opencode</code>。另有一个 <code>opencode-ai/opencode</code>（13,719 star，已归档）是不同项目，别搞混。open issue 5,582，迭代快。</li>
</ul>
<p><a href="https://github.com/anomalyco/opencode">github.com/anomalyco/opencode</a></p>
</td>
</tr>
</table>

::github{repo="anthropics/claude-code"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/anthropics.png?size=128" width="48" alt="claude-code" /></td>
<td valign="top">
<p><strong>anthropics/claude-code</strong> &nbsp;·&nbsp; ★ 143,826 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2025-02-22</p>
<p>常驻终端的编码代理，直接用自然语言改代码、跑测试、管 git。</p>
<ul>
<li><b>功能</b>：代码库理解与检索、跨文件编辑、命令执行、git 工作流、可配置 hooks 与子代理。</li>
<li><b>场景</b>：日常开发的全流程；尤其是需要跨多个文件的一致性改动。</li>
<li><b>亮点</b>：官方开源，行为和线上产品一致，不会出现「文档说的和实际的不一样」。</li>
<li><b>注意</b>：open issue 14,900，且模型调用需要 API key 或订阅。</li>
</ul>
<p><a href="https://github.com/anthropics/claude-code">github.com/anthropics/claude-code</a></p>
</td>
</tr>
</table>

::github{repo="openai/codex"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/openai.png?size=128" width="48" alt="codex" /></td>
<td valign="top">
<p><strong>openai/codex</strong> &nbsp;·&nbsp; ★ 120,997 &nbsp;·&nbsp; <code>Rust</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2025-04-13</p>
<p>OpenAI 的终端编码 Agent，Rust 实现。</p>
<ul>
<li><b>功能</b>：终端内执行长任务规划与落地、代码编辑、命令执行、配置化的沙箱与审批策略。</li>
<li><b>场景</b>：习惯终端工作流的开发者；需要把审批粒度调细的团队。</li>
<li><b>亮点</b>：单二进制分发，安装摩擦小；沙箱与审批策略可配置，适合有合规要求的团队。</li>
<li><b>注意</b>：open issue 14,962；需要 OpenAI 账号或兼容接口。</li>
</ul>
<p><a href="https://github.com/openai/codex">github.com/openai/codex</a></p>
</td>
</tr>
</table>

::github{repo="OpenHands/OpenHands"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/OpenHands.png?size=128" width="48" alt="OpenHands" /></td>
<td valign="top">
<p><strong>OpenHands/OpenHands</strong> &nbsp;·&nbsp; ★ 85,999 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2024-03-13</p>
<p>把「AI 软件工程师」做成可自托管的完整平台。</p>
<ul>
<li><b>功能</b>：自主写代码、修 bug、跑测试；多任务并行；带 Web 控制台；另有独立的 agent SDK 与 CLI。</li>
<li><b>场景</b>：需要在团队内共享 Agent 能力、要审计和回溯 Agent 操作记录的场景。</li>
<li><b>亮点</b>：带界面，非开发者同事也能用；软件工程能力（改 bug、跑测试）是它的设计目标，不只是补全。</li>
<li><b>注意</b>：本轮修正地址 —— <code>All-Hands-AI/OpenHands</code> 已 301 跳转到 <code>OpenHands/OpenHands</code>。</li>
</ul>
<p><a href="https://github.com/OpenHands/OpenHands">github.com/OpenHands/OpenHands</a></p>
</td>
</tr>
</table>

::github{repo="cline/cline"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/cline.png?size=128" width="48" alt="cline" /></td>
<td valign="top">
<p><strong>cline/cline</strong> &nbsp;·&nbsp; ★ 67,373 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2024-07-06</p>
<p>VS Code 插件形态的自主编码 Agent。</p>
<ul>
<li><b>功能</b>：计划 — 执行 — 验证闭环，每步操作在编辑器内可见可撤销；支持作为 SDK、IDE 扩展或 CLI 使用。</li>
<li><b>场景</b>：不习惯终端、希望在熟悉编辑器里用 Agent 的开发者。</li>
<li><b>亮点</b>：每一步改动都以 diff 形式呈现，人工审批成本低；模型可自选，不绑定供应商。</li>
<li><b>注意</b>：open issue 1,188；长任务会消耗较多 token，需要留意成本。</li>
</ul>
<p><a href="https://github.com/cline/cline">github.com/cline/cline</a></p>
</td>
</tr>
</table>

::github{repo="Aider-AI/aider"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/Aider-AI.png?size=128" width="48" alt="aider" /></td>
<td valign="top">
<p><strong>Aider-AI/aider</strong> &nbsp;·&nbsp; ★ 48,684 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-05-09</p>
<p>终端结对编程，每次改动自动生成一个 git commit。</p>
<ul>
<li><b>功能</b>：仓库级代码理解、多文件编辑、自动提交、语音输入、与主流模型对接。</li>
<li><b>场景</b>：习惯 git 工作流、希望每一步都可回滚的开发者。</li>
<li><b>亮点</b>：自动提交这个设计很实在 —— AI 改坏了直接回退到上一个 commit 就行，不用另外做备份。</li>
<li><b>注意</b>：open issue 1,844；Python 技术栈，前端同学改源码成本略高。</li>
</ul>
<p><a href="https://github.com/Aider-AI/aider">github.com/Aider-AI/aider</a></p>
</td>
</tr>
</table>

::github{repo="continuedev/continue"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/continuedev.png?size=128" width="48" alt="continue" /></td>
<td valign="top">
<p><strong>continuedev/continue</strong> &nbsp;·&nbsp; ★ 35,735 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-05-24</p>
<p>可完全自托管的 AI 编码助手，能接本地模型。</p>
<ul>
<li><b>功能</b>：IDE 插件 + CLI + 中心化配置；支持自定义模型、上下文提供者、规则（rules）与工具。</li>
<li><b>场景</b>：代码不能出内网的团队、想用本地模型（Ollama / llama.cpp）的场景。</li>
<li><b>亮点</b>：配置以文件形式管理，可以随仓库一起提交，团队共享一套 Agent 配置。</li>
<li><b>注意</b>：open issue 938；接本地模型时效果高度依赖模型能力，需要有心理预期。</li>
</ul>
<p><a href="https://github.com/continuedev/continue">github.com/continuedev/continue</a></p>
</td>
</tr>
</table>

### 10.3 前端 AI SDK 与生成式 UI

|                                                                     | 项目                    | 定位                           | 分级 | Star   |
| ------------------------------------------------------------------- | ----------------------- | ------------------------------ | ---- | ------ |
| <img src="https://github.com/CopilotKit.png?size=128" width="24" /> | `CopilotKit/CopilotKit` | 给现有 React 应用加 AI 交互    | `T1` | 37,167 |
| <img src="https://github.com/vercel.png?size=128" width="24" />     | `vercel/ai`             | AI SDK，流式生成 UI 的标准方案 | `T1` | 26,553 |
| <img src="https://github.com/stackblitz.png?size=128" width="24" /> | `stackblitz/bolt.new`   | 浏览器内全栈 AI 开发           | `T1` | 16,534 |

`wandb/openui` 和 `thesysdev/openui` 已在第五章展开，这里不重复。

#### 卡片

::github{repo="CopilotKit/CopilotKit"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/CopilotKit.png?size=128" width="48" alt="CopilotKit" /></td>
<td valign="top">
<p><strong>CopilotKit/CopilotKit</strong> &nbsp;·&nbsp; ★ 37,167 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-06-19</p>
<p>给已有 React 应用挂上 AI 交互层，不重写前端。</p>
<ul>
<li><b>功能</b>：侧边聊天组件、内联 AI 自动补全、前端状态可被 Agent 读写、AG-UI 协议；覆盖 React / Angular / Mobile。</li>
<li><b>场景</b>：存量产品加 AI 助手、表单自动填充、让 Agent 直接操作应用状态。</li>
<li><b>亮点</b>：把「应用状态」暴露给 Agent 是它最实用的部分 —— Agent 能读到你当前的表格数据再给建议，而不只是聊天。</li>
<li><b>注意</b>：强绑定 React 为主的使用方式；AG-UI 协议仍在演进。</li>
</ul>
<p><a href="https://github.com/CopilotKit/CopilotKit">github.com/CopilotKit/CopilotKit</a></p>
</td>
</tr>
</table>

::github{repo="vercel/ai"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/vercel.png?size=128" width="48" alt="ai" /></td>
<td valign="top">
<p><strong>vercel/ai</strong> &nbsp;·&nbsp; ★ 26,553 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2023-05-23</p>
<p>TypeScript 里做 AI 应用的工具包，流式 UI 是核心。</p>
<ul>
<li><b>功能</b>：统一的多模型接口、流式文本与流式 UI 组件、工具调用（tool calling）、结构化输出；React / Vue / Svelte 适配。</li>
<li><b>场景</b>：自建 AI 聊天界面、需要流式渲染的产品。</li>
<li><b>亮点</b>：换模型只改一行 provider，不用重写业务代码；和 Next.js 的配合最顺。</li>
<li><b>注意</b>：open issue 1,546，版本迭代快，升级前看 changelog。</li>
</ul>
<p><a href="https://github.com/vercel/ai">github.com/vercel/ai</a></p>
</td>
</tr>
</table>

::github{repo="stackblitz/bolt.new"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/stackblitz.png?size=128" width="48" alt="bolt.new" /></td>
<td valign="top">
<p><strong>stackblitz/bolt.new</strong> &nbsp;·&nbsp; ★ 16,534 &nbsp;·&nbsp; <code>TypeScript</code> &nbsp;·&nbsp; <code>T1</code> &nbsp;·&nbsp; 建仓 2024-09-24</p>
<p>在浏览器里对话式生成完整全栈应用并实时预览。</p>
<ul>
<li><b>功能</b>：基于 WebContainers 在浏览器中运行 Node 环境，AI 生成代码后直接在页面内跑起来；支持编辑与部署。</li>
<li><b>场景</b>：快速验证一个产品想法、做技术演示。</li>
<li><b>亮点</b>：浏览器内跑真实 Node 运行时这件事是它的技术壁垒，不是简单的代码编辑器。</li>
<li><b>注意</b>：open issue 8,189，fork 14,796，社区里大量二开版本；生成的代码质量参差，需要人工重构。</li>
</ul>
<p><a href="https://github.com/stackblitz/bolt.new">github.com/stackblitz/bolt.new</a></p>
</td>
</tr>
</table>

### 10.4 浏览器自动化

::github{repo="browser-use/browser-use"}

<table>
<tr>
<td width="60" valign="top"><img src="https://github.com/browser-use.png?size=128" width="48" alt="browser-use" /></td>
<td valign="top">
<p><strong>browser-use/browser-use</strong> &nbsp;·&nbsp; ★ 112,090 &nbsp;·&nbsp; <code>Python</code> &nbsp;·&nbsp; <code>T0</code> &nbsp;·&nbsp; 建仓 2024-10-31</p>
<p>让 AI 用真实浏览器完成任务，底层是 Playwright。</p>
<ul>
<li><b>功能</b>：把网页结构抽取成 LLM 可理解的形式、Agent 驱动浏览器点击与填表、任务编排、截图与过程记录。</li>
<li><b>场景</b>：E2E 测试辅助、AI 抓取、需要登录态的自动化流程。</li>
<li><b>亮点</b>：DOM 抽取层解决了「把整页 HTML 塞给模型会爆 context」的问题；Python 生态，和 Playwright 复用同一套浏览器。</li>
<li><b>注意</b>：技术栈是 Python，纯前端项目集成需要走子进程或 HTTP 服务。</li>
</ul>
<p><a href="https://github.com/browser-use/browser-use">github.com/browser-use/browser-use</a></p>
</td>
</tr>
</table>

### 附：闭源商业工具（备查）

- **Cursor**、**GitHub Copilot**、**Windsurf**、**Trae**（字节）—— AI 编辑器 / IDE 类
- **v0**（Vercel）、**Lovable**、**Tempo** —— AI 生成 UI 或全栈应用类

开源优先、商业补齐，按需混用。这部分的形态变动快，不做 star 分级。
