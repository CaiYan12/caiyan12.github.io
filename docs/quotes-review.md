# 语录条语料审校表

配套 `public/quotes/quote-catalog.js`（客户端只下发 `英文 / 中文 / 署名` 三列；出处与年份留在本文件，供站长逐条核验与删改）。

**收录口径**：宁缺毋滥。署名会直接显示给访客，所以写错作者就是造假 —— 一手出处追不到的条目不进语料（见文末「已评估但未入语料」表）。**署名可信、但确切编号/页码/措辞未追到一手文本的，标 ⚠️ 保留，站长 2026-09-30 已放行**（裁决记录在文末）。中文译文全部由本站自译，未使用上游 `rushhiii/viora` 数据集里的任何文本（那是他人的劳动成果，且其库本身是作者本人的 Notion 收藏）。

**长度与高度口径（站长 2026-09-30 两轮裁决后的现行规则）**：闸门是**整带高度**，不是字数。第一轮我按「英文 ≤120 字符」把 7 句长名句挡在门外、桌面封顶 132px；站长看过实测分布后裁决**把 Hoare（214 字符）与 Kernighan & Plauger（178 字符）放回，桌面封顶随之放宽到 160px、手机到 260px**。42 条全量逐条实测的包络：

| 视口            | 中位    | 最高（全语料）                  |
| --------------- | ------- | ------------------------------- |
| 1440 / 1100/860 | 98.3px  | **153.4px**（Hoare，英文 3 行） |
| 680             | 107.4px | **156.7px**（Hoare）            |
| 390（手机）     | 132.1px | **251.4px**（Hoare，英文 6 行） |

英文长度因此只剩一条 **≤220 字符**的硬上限（挡"塞一段段落进来"），真正咬人的是 `pnpm smoke:ui` 里那条**把 42 条逐条灌进带子取最高值**的判据 —— 它比"量当前随机到的那一句"确定，也比字数规则直接。手机那条 251.4px 比第一轮报给站长的 235px 高 16px，差额是后来发现的「窄屏 19 条首行压在换句按钮底下」修出来的按钮预留横带（`padding-top` 12→28px）。

## 已入语料（42 条；下表 47 行是全部候选，其中 5 行仍未进语料）

| #   | 署名                     | 英文（首词）                                         | 一手出处                                                                                                                                                                                                                   | 年份        | 口径                 |
| --- | ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------- |
| 1   | Donald Knuth             | Premature optimization…                              | 「Structured Programming with go to Statements」，ACM Computing Surveys 6(4)，原句为 "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil."，本站取后半句 | 1974        | ✅                   |
| 2   | Edsger W. Dijkstra       | Program testing…                                     | 「The Humble Programmer」图灵奖演说，CACM 15(10)                                                                                                                                                                           | 1972        | ✅                   |
| 3   | Edsger W. Dijkstra       | The quality of programmers…                          | 「Go To Statement Considered Harmful」，CACM 11(3)                                                                                                                                                                         | 1968        | ✅                   |
| 4   | Edsger W. Dijkstra       | Simplicity is prerequisite…                          | 署名归属无争议，**确切 EWD 编号无定论**（网上流传的编号互相矛盾）                                                                                                                                                          | —           | ⚠️ 编号待核          |
| 5   | C. A. R. Hoare           | There are two ways…                                  | 「The Emperor's Old Clothes」图灵奖演说，CACM 24(2)                                                                                                                                                                        | 1981        | ✅ ⬆ 长句            |
| 6   | Fred Brooks              | Adding manpower…                                     | The Mythical Man-Month（人月神话）                                                                                                                                                                                         | 1975        | ✅                   |
| 7   | Fred Brooks              | Plan to throw one away…                              | The Mythical Man-Month                                                                                                                                                                                                     | 1975        | ✅                   |
| 8   | Fred Brooks              | The hardest single part…                             | The Mythical Man-Month                                                                                                                                                                                                     | 1975        | ✅                   |
| 9   | Fred Brooks              | Show me your flowcharts…                             | The Mythical Man-Month                                                                                                                                                                                                     | 1975        | ✅ ⬆ 长句            |
| 10  | Fred Brooks              | There is no single development…                      | 「No Silver Bullet」，IEEE Computer 20(4)                                                                                                                                                                                  | 1987        | ✅ ⬆ 长句            |
| 11  | Melvin Conway            | Organizations which design systems…                  | 「How Do Committees Invent?」，Datamation 14(4)                                                                                                                                                                            | 1968        | ✅ ⬆ 长句            |
| 12  | Abraham Maslow           | I suppose it is tempting…                            | The Psychology of Science                                                                                                                                                                                                  | 1966        | ✅                   |
| 13  | Arthur C. Clarke         | Any sufficiently advanced technology…                | Profiles of the Future（克拉克第三定律）                                                                                                                                                                                   | 1962 / 1973 | ✅                   |
| 14  | Antoine de Saint-Exupéry | Perfection is achieved…                              | 《小王子》第四章，Lewis Galantière 英译本                                                                                                                                                                                  | 1943        | ✅（英文为译文笔调） |
| 15  | Richard Feynman          | The first principle…                                 | 1974 年 Caltech 毕业演说；刊载载体各处引用不一                                                                                                                                                                             | 1974        | ⚠️ 刊载载体待核      |
| 16  | Richard Feynman          | What I cannot create…                                | 逝世时留在 Caltech 办公室黑板上的话                                                                                                                                                                                        | 1988        | ✅                   |
| 17  | Richard Hamming          | The purpose of computing…                            | Numerical Methods for Scientists and Engineers 序言                                                                                                                                                                        | 1962        | ✅ **默认句**        |
| 18  | Richard Hamming          | The good work you do…                                | 「You and Your Research」Bell Labs 报告（1994 修订版同文）                                                                                                                                                                 | 1986        | ✅                   |
| 19  | Abelson & Sussman        | Programs must be written…                            | SICP 第一版序言                                                                                                                                                                                                            | 1985        | ✅                   |
| 20  | Eric S. Raymond          | Given enough eyeballs…                               | The Cathedral and the Bazaar（「Linus's Law」）                                                                                                                                                                            | 1999        | ✅                   |
| 21  | Eric S. Raymond          | Release early, release often.                        | The Cathedral and the Bazaar                                                                                                                                                                                               | 1999        | ✅                   |
| 22  | Linus Torvalds           | Talk is cheap…                                       | linux-kernel 邮件列表                                                                                                                                                                                                      | 2000-08-25  | ✅                   |
| 23  | Alan J. Perlis           | A language that doesn't affect…                      | 「Epigrams on Programming」，SIGPLAN Notices 17(9)，第 1 条                                                                                                                                                                | 1982        | ✅                   |
| 24  | Alan J. Perlis           | Simplicity does not precede…                         | 同上                                                                                                                                                                                                                       | 1982        | ✅                   |
| 25  | Jon Postel               | Be liberal in what you accept…                       | RFC 1122 §3.2.2 的「robustness principle」；措辞在 Postel 早期 TCP 规范中已有等价表述                                                                                                                                      | 1989        | ⚠️ 确切措辞首现待核  |
| 26  | M. D. McIlroy            | We should expect our customers…                      | 「Mass Produced Software Components」，Proc. 2nd Annual Design Automation Conference；原句前还有 "We should respect the intelligence and capabilities of our customers."，本站取后一句                                     | 1968        | ✅                   |
| 27  | Mike Gancarz             | Write programs that do one thing…                    | The Unix Philosophy（MIT Press）——**这段常被记到 McIlroy 名下，但这句话的字面出自 Gancarz 对麦氏原则的归纳**，故署名按字面归属记                                                                                           | 1997        | ✅ 署名已改判        |
| 28  | Dennis M. Ritchie        | Unix is simple…                                      | 「Reflections on Software Research」，ACM TOMS 12(2)                                                                                                                                                                       | 1986        | ✅                   |
| 29  | Kernighan & Plauger      | Debugging is twice as hard…                          | The Elements of Programming Style 第 2 版（「Kernighan's Law」）；流传版本措辞与书内略有出入                                                                                                                               | 1978        | ⚠️ 措辞待照书核      |
| 30  | Niklaus Wirth            | Algorithms + Data Structures = Programs              | 同名书标题                                                                                                                                                                                                                 | 1975        | ✅                   |
| 31  | Niklaus Wirth            | Software is getting slower…                          | 「A Plea for Lean Software」，IEEE Computer 28(3)                                                                                                                                                                          | 1995        | ✅                   |
| 32  | David Wheeler            | All problems in computer science…                    | 由 Eric Allman 在 1997 年转述 Wheeler 此言；后半句「除了间接层过多」是 Allman 自己补的，本站未收                                                                                                                           | 1997        | ⚠️ 转述载体待核      |
| 33  | Phil Karlton             | There are only two hard things…                      | Tim Bray 博文「Two Hard Things」（2010-06-22）转述 Karlton 在 Netscape 的话                                                                                                                                                | ~1998       | ✅                   |
| 34  | Jeff Atwood              | Any application that can be written in JavaScript…   | Coding Horror 博文（Atwood's Law）                                                                                                                                                                                         | 2007        | ✅                   |
| 35  | Jeff Atwood              | The best code is no code at all.                     | Coding Horror 博文「The Best Code is No Code At All」                                                                                                                                                                      | 2007        | ✅                   |
| 36  | John Ousterhout          | Complexity is anything related…                      | A Philosophy of Software Design 第 5 章                                                                                                                                                                                    | 2018        | ✅                   |
| 37  | Alan Kay                 | The best way to predict the future…                  | 归于 Kay（1970 年代初 Dynabook 讨论）；更早的同类表述存在                                                                                                                                                                  | 1971        | ⚠️ 首创存疑          |
| 38  | Tim Peters               | Simple is better than complex…                       | PEP 20「The Zen of Python」                                                                                                                                                                                                | 2004        | ✅                   |
| 39  | Tim Peters               | Readability counts.                                  | PEP 20                                                                                                                                                                                                                     | 2004        | ✅                   |
| 40  | Tim Peters               | Errors should never pass silently…                   | PEP 20（含下一句 "Unless explicitly silenced."）                                                                                                                                                                           | 2004        | ✅                   |
| 41  | Martin Fowler            | Any fool can write code…                             | 归于 Fowler，常被引作 Refactoring 语，但无定本页码                                                                                                                                                                         | 1999        | ⚠️ 页码待核          |
| 42  | Hunt & Thomas            | Every piece of knowledge…                            | The Pragmatic Programmer（DRY 原则）                                                                                                                                                                                       | 1999        | ✅                   |
| 43  | Martin Golding           | Always code as if the guy…                           | Usenet 帖子（1991），常被引；版面与新sgroup 记录不一                                                                                                                                                                       | 1991        | ⚠️ 载体待核          |
| 44  | John Gall                | A complex system that works…                         | Systemantics / The Systems Bible                                                                                                                                                                                           | 1975        | ✅                   |
| 45  | Alan Turing              | We can only see a short distance ahead…              | 「Computing Machinery and Intelligence」，Mind 49(192) 结尾                                                                                                                                                                | 1950        | ✅                   |
| 46  | Rob Pike                 | You can't tell where a program is spending its time… | 「Notes on Programming in C」Rules of Programming 第 1 条；原文作 "…where programs are spending their time…"                                                                                                               | 1989        | ⚠️ 措辞待照原文核    |
| 47  | Rob Pike                 | Build-aided programming…                             | 同上，第 4 条                                                                                                                                                                                                              | 1989        | ⚠️ 同上              |

（表内 47 行是全部候选，与英文原句一一对应；下标 ⬆ 标记长句，其中 Hoare 与 Kernighan & Plauger 已按站长裁决放回语料，其余 5 条见下一节。）

## 长句备选（5 条，暂未入语料）

这 5 句出处都在上面的表里，只是没进 `public/quotes/quote-catalog.js`。**要放回：把下面这三列抄进语料数组即可**，高度按实测值对照现行封顶（桌面 160 / 手机 260）判断 —— 五条都在封顶之内，所以真正的取舍是"手机上一条引言带占掉 202–227px 值不值"。数字为逐条灌进真实带子、含自译中文的实测值。

| 署名                              | 英文字符数 | 桌面整带        | 手机整带        |
| --------------------------------- | ---------- | --------------- | --------------- |
| Fred Brooks（没有银弹）           | 190        | 153.4px（3 行） | 226.8px（5 行） |
| Fred Brooks（给我看表格）         | 169        | 153.4px（3 行） | 202.2px（4 行） |
| Mike Gancarz（只做一件事）        | 159        | 153.4px（3 行） | 202.2px（4 行） |
| Dennis M. Ritchie（Unix 的复杂）  | 137        | 125.9px（2 行） | 202.2px（4 行） |
| Melvin Conway（组织复制沟通结构） | 142        | 125.9px（2 行） | 181.4px（4 行） |

## 已评估但**未入**语料

这几条是站长可能想起来的常见句子，本站主动不收，理由写清楚以免以后又被加回来：

| 句子                                                                                             | 为什么不收                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| "The first, solve the problem. Then, write the code."                                            | 常被记到 Joseph Conrad 名下，实为 John Johnson 的措辞 —— 典型误归属 |
| "Make everything as simple as possible, but not simpler."                                        | 归于爱因斯坦，但其著述中找不到对应原文，属后人概括                  |
| "A ship in port is safe, but that's not what ships are built for."（归 Grace Hopper）            | 实出自 John A. Shedd, _Salt from My Attic_（1928），Hopper 是误引   |
| "The most dangerous phrase in the language is, 'We've always done it this way.'"（归 Hopper）    | 归属广泛但无一手文本可追                                            |
| "Make it work, make it right, make it fast."（归 Kent Beck）                                     | 归属无争议但只在演讲转述里流传，无定本                              |
| "Computer science is no more about computers than astronomy is about telescopes."（归 Dijkstra） | 措辞与出处均为二手记录                                              |
| "Beware of bugs in the above code; I have only proved it correct, not tried it."（Knuth）        | 归属可信但一手讲稿/页码未追到，留待站长点头再收                     |
| "Deleted code is debugged code."                                                                 | 无出处                                                              |
| "It's not a bug, it's a feature."                                                                | 俗语                                                                |

## 中文行字体（站长 2026-09-30 裁决：ZeoSeven「汤宪滨宋」）

带子的中文行只有一行 ≤40 字，但**"只渲染一行所以 CDN 很便宜"是错的**：CDN 分片按**字频区间**切、不按实际用到的字切，所以一句 20 字的随机文学用行会散到 5–17 个文件。下表是 8 款风格化宋体的逐款实测（Playwright 真加载、数 woff2 响应体）：

| 字体                 | 通道          | CSS 本身    | 一行（20 字）命中   | 全 42 条字集（334 字） |
| -------------------- | ------------- | ----------- | ------------------- | ---------------------- |
| **汤宪滨宋**（选用） | ZeoSeven 2401 | **36.0 KB** | 6 个 / **183.5 KB** | 1606.8 KB              |
| 猫啃网臻雅宋         | ZeoSeven 176  | 113.6 KB    | 5 个 / 244.4 KB     | **662.2 KB**           |
| 朱雀仿宋             | ZeoSeven 7    | 115.9 KB    | 8 个 / 215.4 KB     | 922.0 KB               |
| 汇文明朝体           | ZeoSeven 256  | 113.2 KB    | 8 个 / 272.3 KB     | 1343.6 KB              |
| 京华老宋体           | ZeoSeven 309  | 263.9 KB    | 9 个 / 427.5 KB     | 1687.7 KB              |
| 思源宋体             | ZeoSeven 285  | 282.2 KB    | 9 个 / 273.2 KB     | 1902.4 KB              |
| 方正书宋             | jsDelivr      | 121.2 KB    | 17 个 / 362.6 KB    | 1231.8 KB              |
| 字体圈欣意吉祥宋     | jsDelivr      | 59.2 KB     | 12 个 / 455.5 KB    | 1144.3 KB              |

**对照组**：把 42 条译文的 334 个字从仓库里现成的 `public/fonts/方正书宋-简体.ttf`（2.75 MB）用 `subset-font` 裁一刀 = **44.8 KB 单文件**（补上拉丁与标点 48.3 KB）。站长在看过这组数字之后仍选 CDN 路线，理由是字面个性 —— 这是裁决，记下来免得以后被"顺手优化"成本地子集。

**落地方式**：`--font-quote-zh: "TangXianBinSong", var(--font-body)`；那张 CSS **不挂进 `Layout.astro`**，由 `initQuoteBand()` 用一个提前 45% 视口的 IntersectionObserver 在带子接近时注入一次（`link[data-quote-font]`，`smoke:ui` 有判据守这个行为）。CDN 不可达时回落正文黑体。

## 站长的裁决记录与剩余待办

**已裁（2026-09-30）**：

- 表内 9 条 ⚠️（署名可信、出处细节没追到一手文本/页码/确切编号）—— 站长**放行**，全部留在语料里。判据是"写给访客的署名是对的"，不是"引用格式能过论文审查"。以后有人把它们当"未核条目"清理，请以本条为准。
- Hoare 与 Kernighan & Plauger 两句长句放回语料，桌面封顶 132→160px、手机 260px。

**还欠的（不阻塞上线）**：

1. 口味：整批偏工程，读起来像不像你说的话？不喜欢的直接删。
2. 中文译文：全部是本站自译，措辞不合你意的直接改。
3. 上面那 5 条长句备选，要不要再放回来（手机上一条引言带会占 181–227px）。
4. ~~中文正式字体~~ —— 已裁：走 ZeoSeven 汤宪滨宋（见上一节）。要换只改 `--font-quote-zh` 一个 token。

**已裁（2026-10-01，元件外观第二轮）**：

- 卡面描边从借 `.widget` 的 **1px 细灰线改成 2px 品牌绿实线**，理由是「凸显这个元件与上方主体的不同」。原计划决策 9 里那条「1px 细线」被本条推翻；`--shadow-wrapper` 仍然不挪用。
- 左右留白填一对终端箭头 `>` / `<`（站长原话形如 `> 三行语句 <`）。中途我把它做成过 `[ root@windowsit ~ ]$` + `{# 语录 #}` 的提示符文案，**站长明确否决**：「我根本不要…，我要的是 > 与 <」。几何：静息距边框 80px、悬停收到 70px（各向外漂 10px；站长当天先把漂移定在 20px，看过效果后改小为 10px）、垂直居中、`aria-hidden`。
- **换行位置跟着箭头走**（站长 2026-10-01 追加）：正文列不再是写死的 720px，而是由 `--quote-gutter` 反推，桌面实测 880px。
- 顺带修掉两个量出来的旧问题：① 视口 1061–1100 之间带子比白卡左右各出头 20px（`#wrapper` 那档仍受自己的 `max-width:1060` 约束，带子没镜像）；② **681–788 之间英文首行压在换句按钮底下**（上一轮就存在，因为烟测只跑 1440/1100/860/680/390 五档，整段没有采样点）。②的修法是 ≤820px 给按钮让出一条横带并降一档字号，实测最坏从「768 撞 7 条 / 681 撞 11 条」变成全 16 档 0 条，整带最高 158.7px 仍在 160 封顶内。
- **悬停时三行文字淡入一层轻投影**（站长追加）。英文行 `0 1px 2px rgba(0,0,0,.16)`，中文与署名行 `0 1px 1px rgba(0,0,0,.13)`（12–13px 的小字经不起更大模糊半径）。实测浓淡：3× 采样下逐像素平均 Δ=3.07/765、最大 Δ=85、明显变化像素 10.5% —— 读作「浮起」而不脏。走 `transition` 不走 `animation`，指针离开会淡回去；投影属绘制变化，故 reduced-motion 下**保留**。同轮追加：两枚箭头一起浮起，用更远的一档 `0 2px 4px rgba(0,0,0,.22)`（站主要求「阴影距离可以更远一些」，20px 的亮绿单字吃得住这个半径）；箭头的 `transition` 原本已有 `transform`（漂移），新加的 `text-shadow` 必须并进同一条列表，判据因此读它的 `transitionProperty` 同时含两者。
