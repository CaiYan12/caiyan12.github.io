---
title: 当 QScrollArea 吞掉了 Mica：我花了一晚上才找到那层白底从哪来的
published: 2026-09-09 09:21:13
description: "video-to-gif 主页面套上 QScrollArea 后，白底盖住了 FluentWindow 的 Mica。排查记录：setWidget 静默打开 autoFillBackground、qss transparent 回退调色板 Base、rgba 涂层全是绕路，最终用 qfluentwidgets 官方 enableTransparentBackground() + addSubInterface(isTransparent=True) 解决。"
image: /images/posts/20260909092113/qscrollarea-mica-cover.jpg
category: 技术
tags: [Qt, Windows, 踩坑]
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

记录一下，免得下次又踩。

给 video-to-gif （我的一个PyQt项目）主页面套了个滚动容器，起因是视频信息卡放竖屏预览的时候会变得特别高。项目是 PySide6 + qfluentwidgets，Windows 11。

套完之后程序卡住不动。

不是崩，是卡。我机器上当时堆了 11 个 python 进程，其中 8 个是前面卡死的实例在占着，日志被占住写不进去，找了半天才看到真实输出。faulthandler 超时转储给出卡点在 main_window.py:111 的 _init_ui，page_scroll.setWidgetResizable(True) 等。

我先怀疑是嵌套 ScrollArea 的问题，外层 page_scroll 包着内层 params_scroll，两个都在 widgetResizable 下互相触发。把内层的删了，还是卡。这个方向耗了我不少时间，事实上最后证明跟卡顿一点关系都没有。

后来去读 qfluentwidgets 的 ScrollArea 源码，又做了个最小复现，才看出来：

```python
sa = ScrollArea(center)
sa.setWidget(center)
```

ScrollArea(center) 把 center 设成了 parent，setWidget(center) 又把它变成 page_scroll 的子控件，成环了。我的复现脚本一直正常，因为脚本里创建 ScrollArea 的时候没挂 parent。

改成不带 parent 创建，能跑了。满心欢喜，一启动，结果看到了：

![image-20260909095035846](/images/posts/20260909092113/image-20260909095035846.png)

内容区整块白，输入框基本看不见。

经过一轮小复现、定位。qss 样式表先排掉，它只画了边框，viewport 内部照样白。viewport 的 autoFillBackground(False) 试了，没用。enableTransparentBackground() 当时也试过，也没用。这个 API 后来证明是对的，那时候是别的地方没配对。

这儿犯了个蠢的：qss 选择器我写的 #page，代码里那个 widget 的 objectName 是 centerInterface，不匹配，背景静默失效，又不报错，就是不生效。我在最小复现脚本里恰好把它命名成了 page，脚本是暗的，主程序是白的，两边对不上。

qfluentwidgets 暗色主题里的控件背景其实都是透明的，看到的暗色是 FluentWindow 画在后面的。谁在中间铺实底，暗底就没。这个我一开始没搞懂。

最后我试出来能用的是给页面本体上实色暗底 #202020。白屏的问题暂时解决了。提交打包后再看一眼：

![image-20260909095518808](/images/posts/20260909092113/image-20260909095518808.png)

为了解决 Mica 的表现，以下放我对 AI 的 prompt：

> 原先的背景半透明效果似乎没了。

经过一通博弈与分析：

FluentWindow 在 Windows 11 下默认开着 Mica，就是壁纸渗色那种，窗口本身是 QColor(0, 0, 0, 0)。这层 #202020 把白屏治好了，也把它盖死了。

白屏真正的来源是 QScrollArea.setWidget()，它会静默把传进去的 widget 的 autoFillBackground 打开，center 拿系统默认亮色调色板自绘一层 #F4F4F4 的白底。一个名字看着只管"放进去"的 API 去动被放入对象的状态。

setWidget 之后关掉 center.setAutoFillBackground(False)，实色底也撤了。提交打包后验证。

结果是我写的实色底色撤掉后，又变成第一种情况的全白底色了。

然后就是来回拉锯。

> 经过我实测，主界面没有任何winui3式的半透明效果，全部都是全不透明的灰色，仅有窗口标题部与左侧按钮菜单栏保持了原有的WinUI暗色半透明效果。而全体半透明效果你在初次构建程序时就已经实现了

雷霆大思考发力了，AI直接在我本机上跑了个测试：

_用“红色标记法”真机对照实验定位：_

- _viewport qss `background: #FF0000` → **整片红色生效**（viewport 可控）_
- _viewport qss `background: transparent` → 白（**qss transparent 在真机回退成调色板 Base 白底**）_
- _调色板 Base 改红但不开 autofill → 白（无效）_

然鹅实际上跑了这么多趟，跑完还是白。viewport 自己还会拿调色板 Base 铺白，得连它一起透明。改完提交。

> 依旧没有修复，右侧主界面背景全部 solid 灰，完全没有像左侧菜单栏一样的原生 WinUI 深色透明，且发现右侧背景还出现了渲染问题，圆角元件后面出现了黑色方框。我要求完全整个界面统一像左侧菜单栏一样 WinUI3 Fluent 真半透明式背景还有各种元件也一样，表现起来就像Windows UWP的设置界面一样，背景完全统一，多好看的设计。这次没我的允许不准提交

又一轮三窗对比。红色标记法，怀疑哪层刷哪层 #FF0000，看红出现在哪。viewport 的 qss 背景在真机上完全生效，红铺满了，但 background: transparent 会回退成调色板 Base 的白，得给具体 rgba 色值。viewport 改 rgba(32, 32, 32, 200)，center 保持透明。8c45cfb。

看起来花里胡哨，可别被他唬住了，事实上根本就是做无用功。

> 没有成功！右侧依旧 solid 全黑+根本没有你说的深蓝黑半透明 mica！重来！这次不要打包了，直接启动检验给我看

那阵子我还动过换架构的念头，不用 QScrollArea，整页直接透明，滚动改成手动驱动内容位移。计划写了一半，没用上。

> 你构建这个项目的时候不是已经用了某个第三方pyqt winui fluent库了吗，能否重新去那里找

在这之前 AI 一直在跟 QScrollArea 较劲。

事实上，翻 qfluentwidgets 的源码，包括编译在 Qt 资源里的那套 qss，翻出来 StackedWidget[isTransparent=true] { background-color: transparent; } 这条规则，StackedWidget 默认带一层很淡的白色叠加，设了这个属性才全透明。配套的 addSubInterface 有个 isTransparent 参数，官方原生就有，我们一直没用上。

配上 ScrollArea.enableTransparentBackground()，就是库自己设置界面用的那套：

```python
sa = ScrollArea()
sa.setObjectName("pageScroll")
sa.setWidget(center)
sa.setWidgetResizable(True)
sa.enableTransparentBackground()

self.addSubInterface(
    sa,
    FluentIcon.VIDEO,
    "视频转 GIF",
    isTransparent=True
)
```

enableTransparentBackground() 把 ScrollArea 和 content widget 一起处理掉，setWidget 留下的那个 autofill 问题在这儿一并清了。

_**本次方案：回到库里找官方姿势**_

_你说得对——qfluentwidgets 自己就有标准答案。翻了库源码（`fluent_window.py` + 编译在资源里的 `fluent_window.qss`）找到官方机制：_

1. _**`addSubInterface(..., isTransparent=True)`**：官方原生参数（我们之前一直没用它！），会给页面设置透明属性，配合窗口 qss 规则 `StackedWidget[isTransparent=true]{background: transparent}` 让内容区完全透明_
2. _**`ScrollArea.enableTransparentBackground()`**：官方 API，把滚动区及其内容全部透明化_
3. _两者叠加 = **qfluentwidgets 设置界面同款**：Mica 完整透出，正是你图二要的效果_

_之前所有失败尝试（实色补底、qss transparent、rgba 涂层、调色板透明）都是在绕路，因为 `QScrollArea.setWidget()` 会偷偷打开内容 widget 的 `autoFillBackground` 用亮色调色板铺底——官方 API 的组合拳才是正解。_

真机启动，白屏没了，整窗暗色统一。提交构建，就这样：

![image-20260909100843063](/images/posts/20260909092113/image-20260909100843063.png)

所以真正的结论：白底、灰底或是别的什么不透明的背景，事实上都是这个 Qt 自带滚动容器的锅。Qt 自身的元件本身对于样式的自由度就非常保守，想只用 Qss 实现这种现代 UI 效果则更是难上加难。这一点再叠加上 AI 并没有主动去自主选择开源社区已有的解决方案，就导致他会在一个本身就难以解决的问题上一只死磕，除非你主动引导他去尝试新路径（这可能可以解释为注意力机制的问题）。

所以：当你觉得精疲力尽的时候，不妨去 GitHub 翻翻，或许救赎之道，就在其中，千万不要忘了**码农的本质，是搬运工**。

以及是过程中遇到的一些其他问题：

同一批改动撞上个更硬的，PyQt5 和 PySide6 混进同一进程会直接吃 0xC0000409，没有 traceback，什么输出都没有。PySide6 项目别装 PyQt-Fluent-Widgets，会连带装 PyQt5 版的 qframelesswindow。

build.ps1 的中文输出变成 瀹屾垚，无 BOM 的 UTF-8 被 PowerShell 5.1 按 GBK 读了，这是 AI 调用 Powershell 的通病。编码问题，加 BOM 就好。还好不是 AI 打错成别的什么命令了，不知道为啥 AI 经常弄错 Powershell 语法，相关命令一定要仔细审查。

同一个文件被两处代码同时编辑，改动会静默丢。

ffprobe 那边也有个坑，跟 Mica 没关系。mp4 里常内嵌一条封面流，取“第一个视频流”拿到的就是封面尺寸，1080p 被识别成 1280×720 就是这么来的。

之后可能的优化方向：

- 增加主题机制，支持亮色、跟随系统，支持自主设定强调颜色
- 添加队列机制，可一次接受多个文件
- 增加时间轴，方便裁剪预览视频

---

::github{repo="CaiYan12/video-to-gif"}
