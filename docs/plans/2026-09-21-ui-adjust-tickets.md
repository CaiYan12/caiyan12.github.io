# 执行票册：主站 UI 缺陷修复（T0–T3）

- 来源：`docs/plans/2026-09-21-ui-adjust-t0-t3.md`（spec）／ issue #17
- 已发布：本册 23 张票 = issue **#18–#40**，全部挂在 #17 下为 sub-issue；每张票标题下的 `> Issue: #NN` 即其镜像
- 证据登记册：`docs/ui-adjust-0921.md`
- 动工前边界：tag `ui-baseline-0921` = `78e64c3`
- 上位决策：ADR 0002（独立壳）、0003（标题分叉）、0004（还原度政策三条款）

## 本文件怎么用（checkbox 更新规则）

- 每张票的 `- [ ]` 是**验收判据**，不是待办清单：一条判据被真实观测到成立才勾，勾时必须能给出证据（命令输出、指纹差异行、截图编号）。
- 每张票开工时在其标题下追加一行 `> 状态：进行中 @日期`，完成时改为 `> 状态：已验收（commit sha）`。批次停下预览时在批次标题下追加 `> 预览：通过 / 退回（原因）`。
- 任何一张票被退回，只回滚该票的 commit，不牵连同批其他票。
- 判据一律断言外部行为（计算值、几何、操作结果、可访问性树属性），**不断言 CSS 源文本、类名字符串或行号**。
- 所有验证走 `build && preview`，不走 dev（dev 下看板娘不渲染、懒加载样式被 swup 抹掉，均为已知假象源）。

## 阶段 0 · 前置与首条 tracer bullet

### 01. 建立验收管线 + 首条 tracer bullet：文章页标题不再被截断
> Issue: #18

**Blocked by**: 无（可立即开始）

**Delivers**：访客在任意宽度下都能看到完整文章标题；同时把后续所有票共用的两条验收缝隙打通——这是第一颗贯穿「构建 → 预览 → 浏览器断言」的 tracer bullet。

> 状态：已验收（8dd329f）@2026-09-21

- [x] 在工作树干净状态下采集**改前**样式指纹基线（24 页逐元素，含 `::before/::after`；采集前冻结动画、种子化构建期随机，并按既有排除表跳过播放器、看板娘、轮播、3D 标签云、切页瞬时类名与带端口绝对 url）
- [x] 新建冒烟脚本（形态与 base URL 环境变量约定照现有灯箱冒烟），并在 `package.json` 注册入口
- [x] 第一条断言：最长标题那篇在 1440/1100/860/680/390 五档下 `scrollWidth` 不再超出可视宽，且渲染为多行
- [x] 把 `.post-header h1` 从与列表卡共享的组合规则中摘出（自适应高度、允许换行、行高约 1.34、字号沿用实测生效值、`text-wrap: balance`）
- [x] 列表卡 `.post-list .post-header h2` 仍保持单行省略（ADR-0003 的故意分叉，断言其仍被裁切）
- [x] 文章页标题元素补 `title` 属性作为桌面 hover 兜底
- [x] `.post-header` 左侧黑色标记条本轮不动，仅记录其随标题变长的事实
- [x] 冒烟脚本入 CI 可选（不强制，本地跑）→ 定为**不入 CI**，按 Q15 只本地跑

**证据**：基线 `output/fp-before-0921`（24 页，工作树干净、`HEAD`=`origin/main`=`3a798dc`）；`pnpm smoke:ui` 改前 6 FAIL / 改后 9 PASS（最长标题 1440px 由 905/711 单行 → 711/711 两行，390px 三行）；全量指纹差异清单 `output/fp-scan-t01b.txt` = 18 处 `h1`（17 处单行 25→27px、1 处长标题 25→53.5px）+ 15 处标题内 `<i>` 仅继承 `white-space` 无几何变化，其余全为祖先容器高度传播；`astro check` 0 errors / 0 warnings；`prettier --check` 全绿。
**顺带修缝隙 B（两处）**：`iframe.giscus-frame` 加入采集排除表——同一份 dist 连采两次除该 iframe 的 `--loading` class 外**逐行一致**（`output/verify-harness.json`：非 giscus 差异 0）；另把排除表里从不命中的 `.slideshow` 纠正为轮播的真实类名 `.carousel`（它会自动换帧，不排则每次比对多几十条伪差异；比对时端口也必须固定，自定义光标是带端口的绝对 url）。不排除这两项，T1/T2 的「零差异」门禁会随机翻脸。
**已接受副作用（记录，不追改）**：单行 h1 线高 25px → 26.8px（18×1.34），列出页页标题容器 25→27px；`.post-header` 黑条随标题由 45px 长到 74px（390px 下 100px）。

## T0 · 功能与可达性

### 02. 剧透块键盘可操作 + 原版按下态
> Issue: #19

**Blocked by**: 01

**Delivers**：键盘用户能用 Enter/Space 开合剧透块，读屏能播报展开状态；按下时拿到原版钦定的红色反馈。

> 状态：已验收（b223518）@2026-09-21

- [x] 键盘激活与现有点击共用同一处事件委托（遵守 Swup 重初始化协议，不新增第四种初始化轨道）
- [x] 展开态同步 `aria-expanded`，收起态回写
- [x] 按下态使用原版红色值，且**仅**作用于剧透块（正文真按钮留给票 12）
- [x] 断言：Tab 聚焦剧透块 → 按 Enter → 内容可见性与 `aria-expanded` 同步；再按 Space → 复原
- [x] 确认未改 Markdown 插件的 DOM 契约（因此无需删 content layer 缓存）；若实施中改为真按钮，则必须补删缓存步骤并回到 ADR 讨论

**证据**：`pnpm smoke:ui` 本票红时 4 FAIL（该刻共 14 项，随后续票增至 38，见批次汇总）。读数细节：收起态 `rgba(0,0,0,0)` on `rgb(47,47,47)`、按下态 `rgb(255,38,46)` 且本体文字仍透明（不泄字）、展开态 `rgb(55,65,81)` on `rgb(241,243,244)` 且 `aria-expanded="true"`；Space 与 Enter 均与点击共用 `initSpoiler()` 内那一处 document 委托（该函数仍只在 `pagefindReady()` 里调用一次，未新增轨道）。宿主仍是 `span[role=button][tabindex=0]`，`src/plugins/remark-extended.mjs` 零改动 → 不触发 content layer 缓存问题。`aria-expanded` 由首次切换起写入（未切换时缺席＝隐式收起），刻意不在插件里预写 `="false"`，以免改动 DOM 契约。
**缝隙自身修正**：剧透块 color/background-color 带 0.2s 过渡，首版断点点完立即读计算值 → 读到中间帧。改为轮询到 `getAnimations()` 为空再判定（与 `smoke:nice-books` 同一类修正）。评审后又补两刀：判据从 `tabIndex===0` + 脚本 `focus()` 换成**真实 Tab 走位**（实测第 52 次 Tab 停在剧透块上），因为属性在不代表取不到焦点；且走位会把元素顶到视口上沿、被吸顶导航挡住鼠标事件（表现为只有键盘生效），点击前必须先 `scrollIntoView({block:"center"})` 并用条件等待。
**评审改判（两处）**：(1) keydown 原用 `closest(".spoiler")`，会连带劫持已展开块内**子元素**的 Enter/Space（两条轴各自独立指出）→ 收窄为「焦点落在剧透块本体才动作」；(2) 票 04 的上色面实测大于一组（见下）。
**残留（未改，非本票范围）**：点击路径仍用 `closest`，所以已展开块里的子链接被点击时，事件冒泡仍会把剧透块翻回收起——这是改动前的既有行为，票面只要求「键盘与现有点击共用同一处委托」，未授权改点击语义。
**顺带查出的新缺陷（→ 已在下面「第二次改写」里一并修掉）**：`.post-context .spoiler{color:transparent}` 藏不住**子元素**——剧透块里的 `<strong>` 实测恒为 `rgb(17,24,39)`（正文 strong 有自己的颜色规则），即未展开时加粗部分本来就露着字。

#### 站长预览后追加裁决（2026-09-21）：改为悬停即预览、不用手型、带 tooltip 文案〔已被下面「第二次改写」取代，保留以记录决策过程〕

原话：「改为 hover 时显示内部内容（双击容易回到顶部），hover 展现时鼠标不展现手型，且鼠标显示消息『你知道的太多了』」。

**为什么他的抱怨成立**：`initDblClickScroll()` 的双击回顶只排除 `a, button, input`，`span[role=button].spoiler` 不在名单里 → 在剧透块上连点两下真的会跳到页首（读码核实，非推测）。

**改成的语义**：悬停 = **临时预览**（纯 CSS `:hover`，不加类名、不碰 `aria-expanded`，移开即收回）；点击 / Enter / Space = **钉住**（`.revealed` + `aria-expanded` 照旧）。钉住这条路必须留着：触屏没有 hover，键盘用户也没有 hover。字色规则因此拆成 `.revealed:active, :hover:active { color:#fff }` —— 触屏点按那一刻既无 `:hover` 也未钉住，仍得保持藏字。光标由 `pointer` 改 `default`（悬停本身就是预览，不需要手型暗示可点），钉住后仍是 `text`（可选字）。tooltip 走 `title="你知道的太多了"`。

**判据 5 被这次裁决推翻一半**：`title` 只能加在 `remark-extended.mjs` 的输出里（JS 运行时补会让无 JS 访客看不到），于是**确实改了插件的 DOM 契约** → 按 AGENTS.md 大坑规程先 `rm -rf node_modules/.astro .astro/data-store.json` 再构建；产物已核 `<span class="spoiler" tabindex="0" role="button" title="你知道的太多了">`。

**验收**：`pnpm smoke:ui` 现 **45 项全绿**，票 02 段重写为 8 条 —— 悬停展现且 `revealed:false`+`aria-expanded:"false"`（不落状态）、光标 `default`、移开收回、按下红底+已展现字翻白、点击/Enter/Space 钉住与解除、`title` 文案、键盘可达（改为「从前一个可聚焦项按一次 Tab 必落在它上」，不再数总步数：清缓存重渲染后剧透块位次变成第 54 项，且大步走位会掉进 giscus 跨源 iframe）。**红证据取自带改前线上产物**：`title:null`、`cursor:"pointer"`、悬停后 `color` 仍 `rgba(0,0,0,0)` 且不落 `revealed`。

#### 站长第二次改写（同日，取代上一条的交互模型）：改成萌百 heimu 式黑幕，彻底去掉点击

原话要点：「不要有点击事件」「鼠标在上面就和普通文本一样是选文本光标」「展开后里面的内容也不要别的样式，看上去就是一串普通文本被一个黑框盖住」「hover 就很快淡出展开」，实现参考萌娘百科 `span.heimu`。

**最终形态**：`color:#000` + `background-color:#000` 即隐身；`:hover` 只把底色淡成 `transparent`、字色回 `inherit`，过渡 0.15s。展开后没有任何装饰 —— 绿虚线描边、浅灰面板、内距、圆角、原版红按下态**全部删除**。

**代码净删除**：`theme-script.ts` 里 `initSpoiler()` / `toggleSpoiler()` 及 `pagefindReady()` 中的那一行调用整体移除（剧透块从此无客户端逻辑）；`.revealed`、`:active` 两组规则一并删。上一条裁决里的「点击/键盘钉住」随之作废。

**顺带把既存缺陷修掉了**：子元素显式 `color: inherit` + `background-color: inherit`。特异性实测：本条 (0,2,0) 压得住 `.prose :where(strong):not(:where(...))` 的 (0,1,1)（`:where()` 与 `:not(:where())` 都记 0），所以**不需要 `!important`**；实测藏字态 `<strong>` 由 `rgb(17,24,39)` 变 `rgb(0,0,0)`、展现态回正文色 `rgb(55,65,81)`。

**光标实测**：本站所有正文都被自定义光标接管，剧透块与所在段落计算值完全相同 = `url("/style/default.cur"), default`（只有链接是 `link.cur` + `pointer`），且 `user-select: auto` 可选中 —— 「和普通文本一样」是字面成立，不是 I 束光标。

**插件契约第二次变更**：`<span class="spoiler" tabindex="0" role="button">` → `<span class="spoiler">`（伪按钮语义必须去掉：既无激活行为又留着 `role=button` 是 WCAG 4.1.2 失败）。再次按大坑规程 `rm -rf node_modules/.astro .astro/data-store.json` 后重建，产物核对为 `<span class="spoiler" title="你知道的太多了">`。

**有意的可达性取舍（记录，非缺陷）**：内容一直在 DOM 里，读屏与查看源码不受影响；但黑幕没有 hover 也没有焦点目标，**纯键盘的视觉展现没有了**。若日后想补，一行 CSS 即可：保留 `tabindex="0"` 并加 `.spoiler:focus{color:inherit;background:none}`，不需要任何 JS。

**验收**：票 02 段重写为 8 条（无 role / 不进 Tab 序、title 文案、藏字态含子元素全黑且无描边、悬停展现不落状态、展开后与正文同色同底、光标与手型无关、移开收回、**点击后无任何 class/aria 变化**）；`pnpm smoke:ui` 42 项全绿，`test:fancybox` 27/27、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9、单测 51+14 全 0 fail，`astro check` 0 error / 0 warning。

#### 站长实机再纠一处：两段淡出不同步（黑幕双层叠加）

**现象**：`隐藏的 <strong>惊喜</strong>` 里，「隐藏的」与「惊喜」褪得不一样快。

**为什么计算值查不出来**：逐帧采父与子的 `color` / `background-color`，两者**全程完全相同**（亮度 0→36.7→59.2→64；alpha 1→0.655→0.26→0）。问题不在时间轴，在**绘制层数**：我给子元素写了 `background-color: inherit`，于是父层黑条之上又铺一层，淡出途中两层半透明黑相叠（0.26 叠 0.26 ≈ 有效 0.45），「惊喜」那块自然更暗、褪得更慢。

**像素实证**（过渡临时拉到 2s、在半程取样、用 sharp 读两块平均亮度）：静止两区差 **0.0**，半程差 **−34.5**，完全展现差 **−13.1**（后者是加粗本身占墨多的基线）。半程是基线的 2.6 倍 → 判因坐实。**修法**：子元素底色改 `background-color: transparent` —— 黑条只由父元素铺一层，子层既要有压掉自带亮底（`code` 之类）的能力，就不能再叠一层黑。改后半程差降到 −12.0 / −10.5，与基线同量级。

**判据升级（`pnpm smoke:ui` 现 43 项全绿）**：冒烟加一条**像素判据**（`|半程差| ≤ |展现后差| + 5` 且静止差 ≈ 0），并在同一构建上做变异验证：把 `background-color: inherit` 注回去，半程差立刻变 **−35.6** 判据翻红，而静止差与展现后差两种情况下都不动 —— 这条独独测到了层数。**教训入规程**：computed style 与像素不是一回事；凡多层绘制/叠加类视觉缺陷，缝隙 A 必须有像素采样这一路，光读 `getComputedStyle` 永远看不见。

### 03. 无 JS 地板线：两个岛屿的静态说明层
> Issue: #20

**Blocked by**: 01

**Delivers**：禁用 JS 或水合完成前，搜索页与日报页给出可读说明与站内入口，不再呈现整块空白（术语「无 JS 地板线」：只承诺说明，不承诺降级功能）。

> 状态：已验收（008cbf0）@2026-09-21

- [x] 搜索页岛屿加 `slot="fallback"` 层：说明需 JS + 标签/分类/归档三条入口
- [x] 日报页岛屿加 `slot="fallback"` 层：载入中说明 + 离线快照提示
- [x] 使用 `slot="fallback"` 而非已被移除的 `fallback` prop（Astro 6 语义）
- [x] 断言：`javaScriptEnabled: false` 的浏览器上下文中两个页面的说明文字存在
- [x] 断言：开 JS 时说明被岛屿内容替换且不残留（Svelte/React 两条路径都验）
- [x] 明确不实现真·降级搜索（静态托管无服务端 Pagefind），并在票内注明该排除依据

**证据**：改前 2 FAIL（`javaScriptEnabled:false` 下两页正文全空）→ 改后 18/18 PASS。搜索页无 JS 实测文案「站内搜索需要浏览器启用 JavaScript：检索索引在构建期生成，由浏览器在本地匹配。」+ 链接 `/tag/`、`/category/`、`/archive/`；日报页实测「载入中…… AI 日报的条目由浏览器读取构建期生成的离线快照渲染，需要启用 JavaScript 才能阅读。」。开 JS 侧：搜索页输入框出现且说明与 `/archive/` 入口均消失；日报页等 React 自绘 header 出现后正文不再含该串。**排除依据**：Pagefind 只有浏览器侧运行时（`--serve` 是开发预览、Node API 只建索引），GitHub Pages 无服务端可跑查询，故只做「可读说明」不承诺降级功能（= 术语「无 JS 地板线」）。**缝隙自查**：首版用「`astro-island` 有子节点」判接管，被本票刚加的 fallback 立刻满足 → 假绿；改为等岛屿自己的 `header` 出现。

### 04. 当前页态：附加功能组补算 + 移动菜单上色
> Issue: #21

**Blocked by**: 01

**Delivers**：访客在移动端全屏菜单里能看见自己在哪一页；「附加功能」这一组与同文件其余三组行为一致（术语「当前页态」：算了就必须有人画）。

> 状态：已验收（dacf42d）@2026-09-21

- [x] 「附加功能」父项在桌面下拉中按子链接 `some()` 判定 current（沿用既有协议）
- [x] 移动菜单该组子项补 `current` 与 `aria-current`
- [x] 新增消费 `.current` 的移动菜单样式，图案照抄原版桌面菜单当前项（绿色下边框 + 绿色文字）
- [x] 绿边必须压得住既有的浅灰 1px 下边框（实测层叠，非推断）
- [x] 断言：相册页上「附加功能」父项呈 current；390px 下移动菜单当前项计算色为品牌绿
- [x] 副作用记录：图片墙/相册页会开始出现 current，属预期语义

**证据**：改前 3 FAIL → 改后 21/21 PASS。桌面 `/albums/` 上「附加功能」锚点计算色 `rgb(0, 192, 0)`；390px 展开移动菜单后「相册图库」子项实测 `color rgb(0,192,0)`、`border-bottom 2px solid rgb(0,192,0)`（原 `#mmenu .submenu a` 的浅灰 1px 已被压住——新选择器带 `li.current` 才比它特异）、`aria-current="page"`、所属组父项同为品牌绿。图案照抄原版 `colorful-original.css:86`。**上色面比票面措辞更宽（预览时请留意）**：`.current` 此前在移动菜单里只算不画，一旦开画，指纹比对显示全站 24 页里有 27 个锚点变了色与下边框——包含首页/微言碎语/留言板这些顶级项和其余三组的当前子项，不只是「附加功能」。这正是「算了就必须有人画」的语义，但视觉面积确实比单看判据时大。**副作用实测更正**：票面原写「好书/日报页会开始出现 current」不成立——`/books/`、`/ai-news/` 为独立壳、根本不渲染 `#head-nav`（构建产物里查无该锚点）；真正新出现 current 的是主站壳内的 `/albums/` 与 `/images/`。

### 05. 搜索框焦点环与重复提交防护
> Issue: #22

**Blocked by**: 01

**Delivers**：键盘用户能看到搜索框焦点；搜索进行中无法二次提交，结果不再乱序。

> 状态：已验收（8a973ba）@2026-09-21

- [x] 移除组件内对全局焦点环的抑制，让站点统一 `:focus-visible` 生效
- [x] 搜索中禁用提交入口并提供禁用态样式与 `aria-disabled`
- [x] 断言：Tab 到搜索框存在可见焦点指示（不依赖颜色变化单一通道）
- [x] 断言：连点两次只发起一次查询，忙碌期按钮不可操作
- [x] 记录该模块其余状态（pending / error / empty / live region）已具备，不需改动

**证据**：改前 2 FAIL → 改后 24/24 PASS。忙碌期实测 `{disabled:true, ariaDisabled:"true", cursor:"not-allowed"}`；忙碌期把关键词换成一串不可能命中的词再按回车（回车走表单隐式提交，`disabled` 按钮挡不住，只有 `doSearch()` 顶部的 `if (searching) return` 能挡），落定后结果仍为第一次查询的 2 条、空态文案未串入。**焦点环一项的实测与票面预期不符**：改动前未聚焦是 `outline: 2px solid rgba(0,0,0,0)`、键盘聚焦后已是 `rgb(0, 122, 0)`——`global.css` 的 `:where(a,button,input,textarea,select):focus-visible` 特异性与 `.outline-none` 打平、靠源顺序获胜，所以抑制从未真的生效，删掉 `outline-none` 属无视觉变化的清理（断言保留作回归护栏，Tab 32 次可达搜索框）。**为何不用请求计数判「只发起一次查询」**：实测冷/热关键词的 `/pagefind/` 请求数为 10 与 9，属逐词差异而非逐查询差异，做不了判据（避免写出永远为真的断言）。其余状态齐备未改：`{#if searching}` 载入文案、`{#if error}` 错误文案、空结果文案、`aria-live="polite"` 常驻区域。

### 06. 独立壳导航站页最小修正 + 头像块返回入口
> Issue: #23

**Blocked by**: 01

**Delivers**：桌面 logo 的落点页可缩放、语言标注正确、有地标与返回主站入口，且保持其伪终端个性（ADR-0002：继续做独立壳，不纳入主站布局）。

> 状态：已验收（8d83fcb）@2026-09-21

- [x] 语言标注改为中文
- [x] 解除禁缩放（去掉最大/最小缩放与 `user-scalable=no`）
- [x] 全局 `* { font-family }` 收窄到终端风格元素，正文容器补主站正文字体
- [x] 内联品牌色统一到站点 token 值
- [x] 头像块成为指向首页的返回入口并补可见焦点样式；favicon 两处一律不动
- [x] 断言：该页无禁缩放声明、语言为 zh、点击头像块抵达首页且键盘可达
- [x] 断言：该页原有满屏终端动画与弹窗样式未被上述改动波及

**证据**：30/30 PASS（本票改前 5 项 FAIL）。`lang="zh-CN"`、viewport 仅剩 `width=device-width,initial-scale=1.0`；5 处内联 `rgb(0, 190, 0)` → `#00c000`（实测计算色 `rgb(0, 192, 0)`）；`FiraCode.css` 的 `*` 收窄为 `#cmdBox(+*) / #footer / .meBox-title / .meBox-Button(+*) / #site-modal(+*)`，正文段落改用主站 `--font-body` 同一条栈（独立壳拿不到 token，逐字抄 `global.css` 里该 token 的值），打字机行仍 FiraCode。**做法偏离票面（有意）**：Q10-A 原写「外面包一层 `<a>`」，实测包一层会让 `.headPhoto` 的 `top:-15%` 改以新父盒（128px 高）解析、头像会上移约 41px，故改为把该 `div` 直接换成 `<a class="headPhoto" href="/">`（补 `display:block` 保持盒模型）；断言用 `closest("a")` 不锁机制，几何按改动前实测基线逐像素锁住：`.headPhoto 224/104/128/128`、`.meBox 128/164/320/400`、`#box 0/0/1280/164` 三项零差异；`.meBox-text p` 行盒 25→23px 是换正文字体的预期结果，已从几何断言名单里移出、改由字体断言覆盖。键盘：Tab 走位可抵达头像并出现 3px 实线焦点环（脚本 `focus()` 不保证触发 `:focus-visible`，故用真实走位）。favicon 两处未动。
**评审改判（判据 7 原来没被真的覆盖）**：`*` 第一版只点名 `#cmdBox / #footer / .meBox-title`，而 `.meBox-Button`（联系按钮行）与 `#site-modal`（由 `src/pages/domain/index.astro` 注入 site-modal.css + `initSiteModal()`、运行时挂到 body 下的 `<dialog>`）都不在那三个子树里 → 它们的字体跟着从 FiraCode 掉进正文栈，而冒烟当时根本没开弹窗，这条判据在改坏的情况下也会显示绿。现已把两处一起点名，并补三条真测：按钮行计算字体仍 FiraCode、`.meBox-title p` 的 `animation-name` 仍是 `typing, blink-caret`（打字机动效未断）、**点开弹窗后** `#site-modal` 与其 message 仍 FiraCode 且内容高度 > 0。

### 07. 备案链接域名更正
> Issue: #24

**Blocked by**: 无（可立即开始，与 01 无依赖）

**Delivers**：一旦站长填入备案号，页脚链接即指向现行官方域名而非已停用域名。

> 状态：已验收（11ea0d3）@2026-09-21

- [x] 页脚备案域名更正
- [x] 记录当前备案号为空、该块不渲染，属预防性修复（不作为视觉验收项）

**证据**：`Footer.astro` 的 `http://www.miibeian.gov.cn`（拼错的停用域名，`miibeian` 双 i）→ `https://beian.miit.gov.cn`。`src/config.ts:36` 实测 `icp: ""` → 该条件块根本不渲染，故无视觉验收项，纯预防性更正。

> 预览：**通过**（站长 2026-09-21 确认），并追加一条裁决改写票 02 的交互（悬停即预览 / 不用手型 / tooltip「你知道的太多了」）；另插入一项 nav 底线修复（见文末「批次外的插入修复」）。`pnpm smoke:ui` 现 43/43。
> 已按票拆 commit：`3a798dc..bd9ee72` 共 8 个 —— 票 01 `8dd329f`（含冒烟与指纹采集器整体落地）、02 `b223518`、03 `008cbf0`、04 `dacf42d`、05 `8a973ba`、06 `8d83fcb`、07 `11ea0d3`、插-1 `bd9ee72`。切分代价已认并记录：冒烟脚本随票 01 一次性带入后续票的断言，因此在票 02-07 各自的历史检出点上该脚本会报红（它不入 CI，三条工作流不受影响）。

**T0 批次验证汇总（改前 `HEAD`=`origin/main`=`3a798dc`，工作树干净时采的基线）**
- 缝隙 A `pnpm smoke:ui`：38 项全绿（逐项先红后绿；红态记录见各票证据行）；console 报错按票分账，不再让票 01 的报错记到票 06 头上
- 缝隙 B 指纹比对 `output/fp-before-0921` → `output/fp-after-t0-fixed`（清单 `output/fp-scan-t0-fixed.txt`）：真实差异只有三类——① 18 处 `h1`（17 处单行 25→27px、1 处长标题 25→53.5px，票 01）② 15 处标题内 `<i>` 仅继承 `white-space`、无几何变化 ③ 27 个移动菜单 `a` 变色+下边框（票 04）；`/search/` 那 4 条只是指纹以类名作键导致的输入框/按钮改键，逐项比对 58 个属性零差异；其余全为祖先容器高度传播。基线本身经一次连采两遍逐行一致的确定性验证
- **基线吃过陈旧渲染，操作规程要改（重要）**：`output/fp-before-0921` 是在**未清 content-layer 缓存**的 `pnpm exec astro build` 上采的。票 02 加 `title` 时按 AGENTS.md 大坑规程删掉 `node_modules/.astro/` 重建，该文章页可聚焦项位次由 52 变 **54**，与线上（CI 强制 `cache:false`）实测逐项目视一致（54、正文内 37；总数 178 vs 177 差的那 1 项是侧栏「手气不错」构建期随机）→ 旧基线确实在比缓存而非代码。**今后每一轮指纹采集前必须先 `rm -rf node_modules/.astro`（及存在的 `.astro/data-store.json`）再 build**，缝隙 B 才名副其实
- **缝隙 B 本轮修掉两处会让门禁随机翻脸的来源**：(1) `iframe.giscus-frame`（远端 postMessage 改 class 与高度）加入排除表；(2) 排除表里原写的 `.slideshow` **全站零命中**——首页轮播真实类名是 `.carousel`（`Slideshow.astro:23`），即 AGENTS/审计记录里「轮播已排除」是假的，它会自行换帧，不排就每次多出几十条当前帧差异（比对端口也得固定：自定义光标是带端口的绝对 url，换端口＝数千条 `cursor` 假差异）。两处都只动采集脚本、不动站点；因此 T0 这份比对里 52 条轮播行与 4 条 giscus 行表现为「仅基线有」——基线早于排除表变更，一次性伪影，之后每票自带的成对比对不再受影响。轮播指示点几何按票 10 判据改由冒烟承担
- 两轴评审（Standards / Spec 并行子代理）后回收四项：keydown 收窄到剧透块本体、票 06 补弹窗与动效判据、`global.css` 行号引用改回 token 锚点、`smoke:ui` 写入 AGENTS.md 常用命令。评审认定无 AGENTS.md/ADR 硬违反（Swup 单轨协议、Navbar/MMenu 双处同步、ADR-0003 分叉、锁定项均未破）
- 既有套件：`astro check` 0 error / 0 warning、`test:fancybox` 27/27、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9、六组 `node --test` 单测 0 fail、`prettier --check ./src ./scripts` 全绿（`public/domain/css/*` 不在 prettier 扫描范围，保持其自身 4 空格风格，勿顺手 `--write`）
- 一次 `astro build` 因 `fonts.googleapis.com` TLS 抖动失败（AGENTS.md 已记录该现象），重跑即全绿；本轮验证走 `pnpm exec astro build`，`src/constants/*` 未被弄脏
- **缝隙查出的既存缺陷（新，不在 T0 任何一票内）**：`private: true` 的文章页（实测 `/posts/20240501000000/`，category 示例）仍渲染指向 `/category/示例/` 的面包屑，而 `getCategoryList()` 走 `isPublicPost` 过滤、该分类页根本不生成 → 本地 404 死链。冒烟里按名白名单放行（`KNOWN_DEAD`，写明理由），只为让新出现的死链仍然报红；修法（私有页隐分类链接 or 为其生成分类页）→ **已开 issue #41**（贴 `bug`；`needs-triage` 在本仓库并不存在，见下条）。补测确认标签侧同源：该文自己链出的 `/tag/示例/`、`/tag/Markdown/`、`/tag/扩展/` 也都 404，`getTagList()` 同样走 `isPublicPost` 过滤，所以两种修法必须同一判据一起处理，否则又只剩一半。**顺带查出一处标签词表漂移（归票 19 更正）**：`docs/agents/triage-labels.md` 声称沿用五个默认标签串，仓库实际只存在 `wontfix` 与 `ready-for-agent` —— `needs-triage` / `needs-info` / `ready-for-human` 从未创建，`gh issue create --label needs-triage` 直接报 not found，故 #41 只能贴现实存在的 `bug`
- **未验证项**：真机触屏与读屏软件下的命中区/播报（冒烟只覆盖计算值与 ARIA 属性）；`.post-header h1` 在超长不可断西文 token 下的表现（当前无此类标题）；剧透块点击路径仍会被子链接冒泡翻转（既有行为，本批未授权改）
- **已知会过时的断言**：票 01 的「最长标题那篇」把 slug 写死在 `/posts/20260831000000/`（89 半角单位）。将来若发布更长标题，该组「不被裁切」断言会停止覆盖最坏情形而不报错——届时需换 slug 或改为从归档页动态取最长者

**T0 批次停止点** → 交站长本地预览，通过后才允许按票拆 commit；未通过项退回原票，不进入 T1。

## T1 · 一致性与度量

### 08. 次要文字单源化（含注释事实更正）
> Issue: #25

**Blocked by**: 01, 04

**Delivers**：全站次要文字对白底达到 5.74:1，并依 ADR-0004 条款三把该偏离转正为基线。

> 状态：已验收（280e14a + 补漏 b3668a8）@2026-09-21

- [x] 三处侧栏文字（换一批按钮、最新评论时间、留言板时间）从原版不达标灰值提到统一值
- [x] 其余漂移灰（四处 `#888` 类、`#767676` 类）收敛到同一 token
- [x] 更正「自称达 AA」的注释为实测事实
- [x] 断言：上述落点计算色一致且对白底 ≥4.5:1
- [x] 指纹比对：除颜色类属性外，其余计算样式零变化

**证据**：改动集中在 `src/styles/global.css`（14 个文字落点 + `--text-light` 并轨为 `var(--colorful-text-secondary)` 别名）与 `src/styles/markdown-extended.css`（贡献日历 5 处）。被替换的原值分布：`#767676` 4 处、`#888` 4 处、`#999aaa` 3 处、`var(--colorful-muted)`（即 `#667a8a`）8 处。

缝隙 B（`output/fp-before-t08` → `output/fp-after-t08`，24 页 × 逐元素计算值）由 `output/colour-only-proof.mjs` 判定：**606 个元素条目发生变化，其中含非颜色属性差异的条目 0 条**。颜色改动全部收敛到同一目标值：`rgb(118,118,118)→rgb(102,102,102)` 504 条、`rgb(136,136,136)→` 60 条、`rgb(102,122,138)→` 30 条、`rgb(153,154,170)→` 12 条，无其它色值漂移。

缝隙 A：`pnpm smoke:ui` 枚举 17 处次要文字落点，本次访问到的页面命中 13 处，`distinct = rgb(102, 102, 102)` 单一值；对白底实测 **5.74:1**（≥4.5）。

**⚠️ 本票第一次提交是漏的，由线上核验抓出（`280e14a` 未覆盖全部落点）**：推送后逐页量线上计算值，发现 `.archive-entry-date` 仍是 `rgb(119, 119, 119)`——**#777 这一族灰根本不在我的枚举清单里**，`global.css` 里还有 4 处（`.post-lisence`、`.status-wall-meta span`、`.archive-entry-date`、`.pagenavi .pagenavi-dots`）。根因是判据形态错了：正向枚举「我想得到的落点」，清单本身就是这次缺陷的产物——漏了一个值，断言就跟着瞎，本地 67 项一路全绿而线上明晃晃留着 8 类残留元素（含继承自上述父元素的 `br`、`i.fa` 等）。补救见 commit `b3668a8`，两件事：
1. **改判据形态**：冒烟里换成**反向扫描**——任何可见元素的计算 `color` 都不得等于改版前那五组灰（#777/#888/#767676/#999aaa/#667a8a），新落点无需改断言即被覆盖。红证据取自**线上改前产物**：同一断言在线上（已含 `280e14a`）报出 8 类残留，在修复后的本地构建上报零命中，证明这条门禁真的会咬。
2. **顺带把 3 处字面 `color: #666` 指回 token**（同值、无视觉变化），使「单一来源」名副其实。

修复后的指纹比对（`output/fp-after-t14` → `output/fp-after-t08fix`）：**41 个条目变化，全部是 `color: rgb(119,119,119) → rgb(102,102,102)`，非颜色属性差异 0 条**。

**注释事实更正两处**：`--colorful-muted` 原注释自称「#667a8a 文本用例达 AA（≈4.65:1）」为误记，实测 **4.45:1 未达 AA** → 该 token 现明确只供描边/装饰，文字一律走 `--colorful-text-secondary`；`--text-light` 原注释的 4.54:1 属实（#767676），但它与其它灰值不同源，故按 ADR-0004 条款三并入单一来源。

### 09. 站点标题降级与标题层级拉平
> Issue: #26

**Blocked by**: 01

**Delivers**：每页只有一个顶级标题，侧栏部件与文章页不再跳级，且头部视觉逐像素不变。

> 状态：已验收（1e91e86）@2026-09-21

- [x] 站点标题降为非标题元素，全部消费该元素的选择器逐条重指
- [x] 侧栏部件标题与文章页跳级层级拉平
- [x] 按 AGENTS.md 硬要求在 681/770/860/980/1100px 复查头部标题位置（该区域为文档锁定的脆弱区）
- [x] 断言：每页顶级标题数 = 1
- [x] 指纹比对：头部区域计算样式零变化（除标签名本身不进计算样式的部分）
- [x] 确认无脚本依赖头部标题元素（已核：现有查询都指向文章内标题）

**实施**：`Navbar.astro` 两处站点标题 `h1 → p.site-title`，`global.css` 8 条消费该元素的选择器重指（含 681–1100 脆弱带那两条）；`WidgetLayout.astro` 部件标题 `h3 → h2` 并重指 `.widget h3`/`.widget > h3`/`.widget > .icon + h3` 三组规则；首页补一个 `sr-only` 顶级标题（它原本是唯一没有正文级 h1 的页面）。

**⚠️ 本票踩到的两类「CSS 改了、DOM 没跟」漏点（都由缝隙 B 抓出，非人工发现）**：
1. `contributions-calendar.ts` 的日历卡标题**自己内联写 `h3`**，不走 `WidgetLayout` → `.widget h3` 重指后它失去全部部件标题样式（字号 14→13、行高与 30px 盒高、下边框、左右内距全丢），表现为 `/about/` 整页高度 −5px 却找不到叶子。改为 `h2`（与部件族一致，且顺带消掉一处 h1→h3 跳级）后 `/about/` 指纹**同路径差异 0 条**。
2. `archive.astro` 的年份标题同样内联写 `h3`，而 `.archive-year-heading h3` 已被重指为 `h2` → 年份大字从实测 28px 掉到 13px。改为 `h2` 后恢复 28px，且修掉了 h1→h3 跳级（这正是该重指的初衷）。
教训：重指 `hN`→`hM` 必须枚举**所有**输出该元素的代码点，共享布局组件不是唯一来源。

**首页那个 sr-only 标题的位置是一条真实约束**：卡片下划线色带按 `.post-list:nth-child(N)::after` 取色，把它放进 `#content` 会让六张卡各自的颜色整体位移一位（实测首卡 `rgb(255,215,0)` 变 `rgb(51,153,204)`，多出的 `#f0f` 来自 nth-child(9)）。而色带**跨页本来就不齐**——`/hot/` 首卡是 `nth-child(2)` 的 `#ff0688`，首页首卡是 `nth-child(3)` 的 `#ffd700`，所以任何 `nth-child → nth-of-type` 的重排都会改掉某一类页面的既有配色（已在生产站上实测确认）。最终做法：`MainGridLayout` 在 `<main>` 内、`#content` 外开一个 `heading` 具名插槽——标题回到 DOM 首位（阅读顺序 `1` 然后全是 `2`），卡片索引不受影响（实测首卡仍是 `#ffd700`）。

**证据**：缝隙 B 用两套比对互为印证（`output/fp-after-t08` → `output/fp-after-t09e`，24 页逐元素计算值）。
- **顺序无关多重集**（`output/multiset-diff.mjs`，权威）：全 24 页共 113 条差异 = 56 消失 + 57 新增，**逐条都是 `h1→p.site-title` 或 `h3→h2` 的改名对**（改名前后的属性串完全相同），外加首页那一个新节点；四个独立壳页（books ×3、ai-news）多重集**字节级相同**——印证它们不渲染主站头部。
- **槽位对齐 + 标签剥离**（`output/verify-t09.mjs`）：**163 个改名元素逐属性完全相同，同路径差异 0 条**。唯一的位置漂移全部集中在首页（446 条）：`<main>` 里新增一个子节点会让其后整棵子树的槽位序号后移一位，这是比对键的伪影而非样式变化，已被上一条无序比对否证。
- 首页标题大纲实测由 `222222`（六张卡先于任何顶级标题）变为 **`1` 后接全 `2`**；`/archive/` 大纲 `12222222222`、文章页 `1 2… 3…` 均无跳级。仍存 `1→3` 跳级的是 `/guestbook/ /skills/ /projects/ /timeline/` 四页的**内容级**标题（页面自己内联写的 h3，不在部件族内），`pnpm smoke:ui` 以 NOTE 形式持续报告，是否拉平留给站长判（票 09 判据只覆盖侧栏部件与文章页）。

**站长裁决（2026-09-21）**：四页内容级跳级本轮**不动**，冒烟继续以 NOTE 报告其存在。
- 缝隙 A：`pnpm smoke:ui` **50/50 全绿**，含「每张主站页面恰好一个可见 h1」（13 页读数均为 1）、「侧栏部件标题已并到 h2」`{"h3":0,"h2":7}`、以及头部标题在 681/770/860/980/1100/1440 六档下几何与计算值逐项不变（`HEAD_BASE`，681–1100 为文档锁定脆弱带）。

**验证环境的一次伪红（记录以免后人误读）**：本票复跑 `pnpm smoke:ui` 时出现过 1 红「忙碌期的第二次提交被忽略」，读数 `结果数=0 空态文案=false`。根因不在站点：为保持 `src/constants/*.json` 干净而走的 `pnpm exec astro build` 会**先清空 `dist/`**，而 `pagefind --site dist` 与 `inject-buddha-banner` 是 `pnpm build` 里更靠后的两步，于是 `/search/` 岛屿落到「索引不可用」分支、搜索自然零结果——它真正要测的「第二次提交被忽略」当时依然成立（zzz 词从未出现在页面里）。补跑 `node scripts/inject-buddha-banner.mjs && node_modules/.bin/pagefind --site dist` 后恢复 50/50。规则：**astro-only 重建后、任何跑浏览器缝隙之前，先补这两步，并 `ls dist/pagefind`。**

### 10. 命中区：药丸仅窄屏放宽 + 幻灯片点扩热区
> Issue: #27

**Blocked by**: 01

**Delivers**：移动端主要控件达到 24px 命中底线，而外观与原版盒值不变。

> 状态：已验收（703db1e）@2026-09-21

- [x] 药丸仅在窄屏断点下扩大垂直内距；桌面保持与原版逐字节相同的盒值
- [x] 幻灯片指示点用伪元素扩热区，10×10 外观尺寸不动（该尺寸即原版值）
- [x] 明确**不修**内联在文字流里的面包屑与页脚链接，依据是命中区标准的 Inline 豁免
- [x] 断言：390px 下药丸命中高 ≥24、指示点热区 ≥24 且外观尺寸未变
- [x] 断言：桌面药丸云的行数与间距与改前一致

**实施**：`global.css` 新增一条 `@media screen and (max-width: 680px)`（紧贴药丸家族之后）——垂直内距 3→5px 使命中高 20→24px，同时装饰件跟着盒高走：左侧三角上下边框 10→12（合计始终等于盒高，否则色带左肩缺 4px）、白点 `top` 8→10（保持居中）。桌面一条规则都不动。指示点用 `.carousel-indicators li::before`（`inset: -10px -2.5px -4px`）扩热区，li 补 `position: relative`；按钮本体与 10×10 视觉盒一字未改。

**⚠️ 一处判据按实测改写（不是放松，是原写法不可达）**：指示点**横向**做不到 24px——原版点距就是 10px 点 + 5px 右外距 = **15px 中心间距**，扩到 24 就会与相邻点重叠，而重叠区按绘制顺序归后者，结果是「点左边那枚」被右边的热区吃掉，反而制造票面用户故事 11 明确要避免的误触。故热区取 **15×24**：横向只吃满 5px 间隙的一半（±2.5px，两盒恰好相切不重叠），纵向吃满 `.carousel-indicators` 自己的 40px 带（非对称 -10/-4，再多 1px 就压到下方幻灯片链接的可点区）。若站长要真正的 24×24，代价是把点距从 15px 拉开到 ≥24px——那是视觉改动，属另一件事。

**站长裁决（2026-09-21）**：维持 15×24，**不**为凑 24×24 拉开点距——外观保真优先，误触风险不接受。

**证据**：缝隙 A `pnpm smoke:ui` **57/57 全绿**，本票 6 条读数——
- 桌面盒值逐档不变：`1440: h=20 pad=3px 7px 3px 7px rows=4/32 距=26 | 681: h=20 rows=5 距=26`（681 为断点上沿，仍走桌面值）
- 窄屏命中高：`390px 命中高=24（改前 20）`
- 装饰随盒高同步：`三角盒高=24 vs 药丸高=24，圆点偏心=0`
- 指示点外观：五枚全部 `10×10` 且自身中心命中自己
- 热区垂直真实范围：五枚均 `上15/点10/下8=24`
- 无误触：`自身=true 邻点安全=true`（每枚的左右邻点中心仍各自归属自己，未被本点热区吞掉）

缝隙 B（`output/fp-after-t09e` → `output/fp-after-t10`，24 页全采）：**多重集差异 0 处**——桌面端到端零变化。轮播指示点本就不在缝隙 B 的可比范围内（`WIDGET_ROOTS` 排除 `.carousel`，它自行换帧），其几何与热区判据按票面约定全部由缝隙 A 承担。

**判据自身的一次红→修**：本票首版把「不越过相邻点中线」写成 `左+右+1 ≤ 15` 的数值代理，实测在**行末那枚**（右侧无邻居）读出 8+7+1=16 而误红——代理式在亚像素取整与行两端不成立。改为行为判据「每枚点自身中心命中自己，且任一邻点的中心既不被本点吞掉、也不落在空隙」后，读数 5/5 稳定通过。同时修掉两处自己的脚本缺陷：`readPills` 在 `page.evaluate` 里引用了 Node 作用域的 `width`（序列化后不存在 → `ReferenceError`），以及命中谓词原先严格等于 `li`，而点中心实际落在 li 内的原生 `button` 上。

### 11. 贡献日历标签字号上调
> Issue: #28

**Blocked by**: 01

**Delivers**：全站最小的那组标注文字提到 11px（窄屏 10px），且不破坏已锁定的日历几何。

> 状态：已验收（c5597aa）@2026-09-21

- [x] 月份与周几标签桌面提到 11px、窄屏 10px
- [x] 首列宽度变量与其硬编码副本、窄屏覆盖一并同步（四处联动）
- [x] 断言：11px 下「12月」不被裁切、周几列不外溢
- [x] 断言：格子仍为方形、`53/7` 整体比例与 subgrid 构造未动、滚动容器内距与入场方向未动（AGENTS.md 锁定项）

**实施**：`markdown-extended.css` 三条字号——`.gh-calendar-months` 与 `.gh-calendar-wd` 桌面 10→11px、`@media (max-width:680px)` 那组 9→10px。

**判据 2 以「实测无需改动」成立（而不是跳过）**：`--gh-wd`（桌面 14px／窄屏 12px）只需容纳**单个**周几汉字，11px 字形仍在 14px 列内、10px 字形仍在 12px 列内，实测三档 `scrollWidth-clientWidth` 外溢均为 0；月标不占首列（首格是空 span，月标从第 2 列起按列跨铺），所以 `.gh-calendar-grid` 里那条 `min-width: calc(14px + …)` 硬编码副本也无须动。**联动点确实存在这一事实记在这里**：一旦将来要动首列宽，必须同批改 `--gh-wd`、该硬编码副本、窄屏覆盖三处，并把冒烟里那条 390px 网格宽基线（现锁 438）一起更新。

**证据**：缝隙 A `pnpm smoke:ui` **63/63 全绿**，本票 5 条读数——
- `1440=11px/11px 681=11px 390=10px/10px`（681 仍走桌面档，断点为 `max-width:680px`）
- `外溢=0 裁切=0.0 月标=12` 三档齐过（月份行 `.gh-calendar-months{overflow:hidden}` 会裁 nowrap 溢出，故按标签右缘 vs 容器右缘逐枚量）
- 锁定项：`格=15.3×16 / 7.4×8.1 / 6×6.5`（方形误差 ≤1px，周几列带来的 <1px 误差为既有设计）、`比例=7.571/7.572 vs 53/7=7.571`、`rows=subgrid`、`内距=0px 3px 4px 0px` 三档全等
- 入场方向从**运行时动画对象**读，不读源码：`{"name":"gh-calendar-col-in","first":"translateY(-6px)","y":-6}`
- 窄屏横滚范围未扩大：`390 网格宽=438`（与基线一致）

缝隙 B（`output/fp-after-t10` → `output/fp-after-t11`，24 页全采，`output/prop-histogram.mjs` 逐属性归因）：**只有 `/about/` 一页有变化，共 30 条**，属性分布为 `font-size` 18 条 + `line-height` 15 条（全部落在 `.gh-calendar-months`/`.gh-calendar-month`/`.gh-calendar-wd` 与两个图例 span 上）、`height` 27 条（月标行 +1px 后沿 html→body→…→`section.widget.gh-calendar` 的高度传导链，页面总高 3718.5→3719.5px）；另文档右下角翻页折角的 `inset` 随页面高度同步下移 1px。**其余 23 页逐条零差异。**

**判据自身的一次假红**：入场方向首版在 `waitUntil:"commit"` 时刻读计算值，那时样式表尚未生效，`animationName` 恒为 `none`；改为等样式就位后重启该列动画（`animation="none"` → 强制回流 → 复原）再读首帧关键帧。同批修掉另两处脚本缺陷：`gridTemplateRows` 的计算值实为 `"subgrid [] [] [] [] [] [] [] []"` 而非 `"subgrid"`（等值比较假红），以及「窄屏不该出现横向滚动」这条判据本身写错——窄屏触到 `--gh-cell-min` 下限后**局部横滚正是既有设计**，已换成锁网格宽度基线。

### 12. 原版正文按钮家族搬回
> Issue: #29

**Blocked by**: 01

**Delivers**：正文中的真实按钮获得原版完整的基态 / hover / 按下三态，补齐一处迁移遗漏。

> 状态：只记录、不新增规则（站长 2026-09-21 已确认，本票不产 commit）@2026-09-21

- [x] 先枚举正文中真实存在的按钮并逐个截图，确认误伤面
- [ ] 搬回三态，仅作用于正文真按钮；剧透块保持其藏字所需的暗底样式
- [x] 断言：枚举出的每个按钮三态可见且不破坏其所在组件布局
- [x] 若枚举结果为空，本票降级为「只记录、不新增规则」并在此注明

**枚举结果（206 个产物页全扫，`output/t12-enumerate-buttons.mjs`）**：正文容器 `.post-context` 内的 `<button>` 分布在 12 个页面，逐一看属主——
- **Expressive Code 的「Copy to clipboard」**：11 篇（单篇最多 50 个），属高亮元件自带 chrome；
- **`#giscus-retry`**（`/guestbook/`）：仅在 Giscus 加载失败时出现，静止态 `display:none`；
- **搜索岛屿的提交按钮**（`/search/`）：静态扫描看不见（水合后才有），但它确实落在 `.post-context` 内。
**作者手写的正文按钮：0 个。**

**三态实测（`output/t12-collateral.mjs`，hover/active 均走真实指针并等过渡跑完）**：
- EC 复制按钮 `透 0 → 1 → 1`：属主用「悬停才显形」表达状态，本身即反馈；底色/字色/边框三态恒定为它的设计。
- 搜索按钮 `rgb(0,122,0) → hover rgb(0,170,0)`：组件自带 hover 反馈。
两者都不需要、也不该被外部规则改写。

**误伤面已用实验证实（不是推测）**：把原版 `colorful-original.css:315` 的基态逐字临时注入 `/search/`，搜索按钮立刻由「白字黑边绿底」变成**字色 `rgb(0,204,0)`、边框 `rgb(0,204,0)`** —— `.post-context button`(0,1,1) 压过了组件自己的 `text-white`/`border-black`(0,1,0)。底色没被压掉只是因为 `hover:bg-primarydark`(0,2,1) 更高，属巧合而非安全。

**结论**：这条原版家族在本站**没有合法作用对象**——原主题是给 Emlog 原生评论表单与作者手写按钮用的，而本站评论区已是 Giscus iframe。故按票面降级条款走「只记录、不新增规则」。**⚠️ 与票面措辞的差异如实记下**：票上写的是「若枚举结果为空」，实测结果并非字面为空（有 12 页按钮），而是「为空」的成立方式——作者手写按钮为 0、幸存者全属元件自管。若站长仍想要这层保险，可选的窄化写法是 `.post-context p > button, .post-context li > button`（只吃作者在段落/列表里手写的按钮），但那属于新增能力而非补缺，需他点头。剧透块（票 02 已定 heimu 暗底）不受本票影响。

**站长裁决（2026-09-21）**：接受「只记录、不新增规则」，不引入窄化写法。本票因此不产 commit。

### 13. 全死规则清理
> Issue: #30

**Blocked by**: 01

**Delivers**：三条被完全覆盖的规则与一条永不匹配的分支从样式表消失，后续会话不再据其推断。

> 状态：已验收（49974bb）@2026-09-21

- [x] 删除列表卡头部容器与卡片标题的两条全死副本、翻页浮动的全死副本
- [x] 删除翻页控件中永不渲染的分支
- [x] 保留：部分幸存的属性、以及「更特异性但同值」的两条（删除会改变层叠语义）
- [x] 断言：**指纹比对完全零差异**（本票的正确结果就是没有任何计算样式变化）

**删除项（按 Q36 的裁决范围逐条对号）**：
1. `.post-list .post-header{padding:5px 0}` —— 被后位同特异性的 `.post-list .post-header, .post-header{padding:0 0 0 20px}` 整体接管；
2. `.post-list .post-header h2{display:inline;font-size:19px;line-height:1.4}` —— 被 `.post-list .post-header h2, .post-header h2{display:block;font-size:18px;line-height:25px}` 接管（**卡片标题实际一直是 18px，不是 19px**，这条就是当初把审计引向错误度量的规则）；
3. `.pagenavi{float:right;margin-top:10px;text-align:center;font-size:13px}` —— 由 `.pagenavi{display:flex;float:none;margin:10px 0 0;…}` 四条各自覆盖（其中三条同值）；
4. `.pagenavi em` 分支（选择器组里的 `em` 与 `.pagenavi em{font-style:normal}`）—— 翻页控件从不输出 `<em>`：扫描 206 个产物页的 `<nav class="pagenavi">…</nav>` 片段，命中 0 次。

**保留项按裁决原样留着**：`.post-list .post-header h2 a` 与 `a:hover`（活着）、`.pagenavi a, .pagenavi span` 组的幸存部分（`float:left`+`text-align:center` 仍对嵌套 `span.pagenavi-icon` 生效，因为后位规则用的是 `>` 子选择器）、以及 `.prose{font-size:14px;line-height:1.9}`。

**证据**：缝隙 B（`output/fp-after-t11` → `output/fp-after-t13`，24 页全采）**两套比对同时归零**——顺序无关多重集 `0 处差异`，槽位对齐比对 `改名 0 / 同路径差异 0 / 结构异常 0`。这就是本票的验收形态：删掉的四条没有任何一条在渲染侧说话。比对按票隔离：该次构建发生在票 14 改动之前，故零差异不是两票混采的产物。

### 14. 收尾小项：等宽数字保险与缩略图圆角单点修正
> Issue: #31

**Blocked by**: 01

**Delivers**：一处「图片圆角大于其卡片圆角」的真 bug 被修正；日期与计数类拿到换字体时的等宽保险。

> 状态：已验收（eedb91e）@2026-09-21

- [x] 图片墙缩略图圆角收齐到其卡片圆角
- [x] 三族卡片宽度差异保持不动（分属不同页面，从不并排）
- [x] 日期/计数类加 `tabular-nums`；已实测该声明对当前字体是空操作，作为换字体保险保留
- [x] 断言：缩略图角不再超出卡片圆角
- [x] 断言：本票不产生任何可见排版变化（保险项不作为验收判据）

**实施**：`.photo-grid img` 圆角 10px→5px（票面写「图片墙」，实测真 bug 在**相册详情**那族：卡片 `.photo-grid a` 是 5px 而图是 10px，图角会从卡片圆角里露出来；`.imageswall` 与 `.album-cover` 两族本就合规）。另给 `.archive-entry-date`/`.archive-year-count`/`#newcomment .time`/`.guestbook-meta time` 加 `font-variant-numeric: tabular-nums`，贡献日历的那条加在它自己文件里的 `.gh-calendar-stats` 上。三族宽度一个字节未动。

**证据**：缝隙 A `pnpm smoke:ui` **67/67 全绿**，本票三条读数——
- `相册详情 .photo-grid 图5 vs 卡5 | 相册索引 .album-cover 图5 vs 卡5 | 图片墙 .imageswall 图0 vs 卡0`（判据是「图角 ≤ 卡角」，逐族实测左上角计算值）
- `卡190/图174 期望 190/174 | 卡182/图170 期望 182/170 | 卡182/图180 期望 182/180`（宽度基线）
- `{"variant":"tabular-nums","w1":88,"w0":88,"wm":88}` —— 声明已落地，且 `"1111111"`/`"0000000"`/`"1472580"` 三串实测同宽 88px，印证「当前是空操作」这一前提：保险不改变现状。

缝隙 B（`output/fp-after-t13` → `output/fp-after-t14`）：**24 页里只有 1 页有变化，共 32 条，全部是 `border-radius: 10px -> 5px` 落在 `img` 上**（`/albums/日常随手拍/` 的 32 张缩略图），无第二条属性。

**改前/改后的线上对照（同一台真实浏览器逐项量，`output/t14-widths.mjs`）**：线上仍是 `卡角=5 图角=10`，本地已是 `卡角=5 图角=5`，而三族的六个宽度值两侧完全相同——这既是 bug 的既存证据，也是「只收圆角」的外部证明。

**T1 批次验证汇总（基线 = 票 08 改前的 `output/fp-before-t08`，逐票自带成对比对）**
- 缝隙 A `pnpm smoke:ui` 由 50 项增至 **67 项全绿**（票 10 +6、票 11 +5、票 14 +3，其余为既有条目回归）。逐条先红后绿，红态与各条读数记在各票证据行
- 缝隙 B 每票一对、互不混采：票 08 `606 条全落在 color`（非颜色属性 0 条）｜票 09 `163 个改名元素逐属性相同、同路径差异 0 条`（首页 446 条为新增节点导致的槽位后移，已由无序多重集否证）｜票 10 `0 处差异`（桌面端到端不动）｜票 11 `只 /about/ 一页 30 条，全为字号与其高度传导`｜票 13 `0 处差异`（本票的正确结果）｜票 14 `只 1 页 32 条 border-radius 10→5`
- **本轮由缝隙而非人眼抓出的两类缺陷**：(1) 重指 `hN→hM` 时漏掉两处**内联自写标题**的发射器（`contributions-calendar.ts`、`archive.astro`），前者表现为 `/about/` 莫名 −5px 且祖先链全等、后者让年份大字 28px 掉到 13px；教训与排查手法（枚举全部发射器，别只看共享布局组件）已写进票 09 证据行。(2) 首页补 `sr-only` 标题会**位移卡片色带**——色带按 `.post-list:nth-child` 取色，最终解法是在 `<main>` 内、`#content` 外开 `heading` 具名插槽
- **比对口径新增两件工具**：`output/multiset-diff.mjs`（顺序无关，抗插入位移）与 `output/prop-histogram.mjs`（逐属性 × 元素 × 页归因），两者与既有 `verify-t09.mjs`（剥标签名的槽位对齐）并用，才能把「改名」与「改值」分开下结论
- 既有套件：`astro check` 0 error / 0 warning、`test:fancybox` 27/27、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9、四组 `node --test` 单测 0 fail、`prettier --check ./src ./scripts tailwind.config.cjs` 全绿
- 一次环境性伪红已定位并写进票 09：为躲开 `src/constants` 脏化而走 `pnpm exec astro build` 时，`dist/` 被清空却不会重跑 `pagefind` 与横幅注入，`/search/` 因此落到「索引不可用」分支报零结果。规则：任何浏览器缝隙之前补 `node scripts/inject-buddha-banner.mjs && node_modules/.bin/pagefind --site dist`
- **未验证项**：真机触屏下的 24px 命中（冒烟只量计算盒与 `elementFromPoint` 命中归属）；读屏软件对首页 `heading` 插槽标题的实际播报顺序；票 11 那条「窄屏网格宽锁 438」只在 390px 一档验过，375/320px 未采
- **留给站长的三项判断（2026-09-21 已判，见各票「站长裁决」行）**：① 票 12 是否仍要那层原版按钮保险（要，则按窄化写法 `.post-context p > button, .post-context li > button`，属新增能力而非补缺）② 指示点要不要真做到 24×24（代价是把点距从 15px 拉开，属视觉改动）③ 四页内容级 `h1→h3` 跳级（`/guestbook/ /skills/ /projects/ /timeline/`）是否拉平——它们不在侧栏部件族内，票 09 判据未覆盖
- **三项裁决均按推荐落地**：① 票 12 只记录不新增规则；② 指示点维持 15×24，不拉开点距；③ 四页内容级跳级本轮不动，冒烟继续以 NOTE 报告。站长原话为「已确认待判事项」，此处按「接受推荐」记录；若本意有别，改回的成本只是各票一行判据与一次重建

> 预览：**通过**（站长 2026-09-21 确认「通过 → 按票拆 commit 并 push」），三项待判裁决一并落下（票 12 只记录、指示点维持 15×24、四页内容级跳级本轮不动）。
> 已按票拆 commit：`b1bd30b..eedb91e` 共 6 个 —— 票 08 `280e14a`、09 `1e91e86`、10 `703db1e`、11 `c5597aa`、13 `49974bb`、14 `eedb91e`；票 12 只记录故不产 commit。切分代价与 T0 同：`scripts/ui-smoke.mjs` 随票 08 一次性带入 09-14 的断言，因而在票 09 之前的历史检出点上该脚本会报红（它不入 CI，三条工作流不受影响）。跨票归属用 `output/t1-split.mjs` 机器判定并加了两道硬校验（每个 hunk 恰好一票、末态逐字节复现工作树），提交后 `git diff HEAD` 对两个样式表为空即证切分无损。

**T1 批次停止点** → 预览 + 指纹比对报告交站长；通过后再进 T2。

## T2 · 死规则与文档失真

### 15. 根字号基线显式化
> Issue: #32

**Blocked by**: 01

**Delivers**：「本站根字号等于浏览器默认」成为代码里可读的事实，无人再据一条从未生效的规则做推断。

> 状态：已验收（cfa2acd）@2026-09-22

- [x] 删除从未生效的 13px 根字号规则
- [x] 显式声明百分比基线
- [x] 文档记明：主题尺寸全靠 px；启用 13px 会让以 rem 为单位的工具类集体缩放，属全站重排，已否决
- [x] 断言：**指纹零差异**；且实测根字号仍为 16px

**实施**：删 `global.css` 层内 `html{font-size:13px}`（它被更靠后源顺序、同特异性的 `html{font-size:100%}` 压掉，从未生效）；在存活那条上写明基线，并把完整论述与「为什么不启用 13px」记进 AGENTS.md「样式」段新增的**根字号基线**条目。

**证据**：缝隙 A 读数 `票 15：根字号仍为浏览器默认 16px :: 16px`（计算值，不读源码）；缝隙 B 见本批「T2 批次验证汇总」——删改后 24 页里除 404 页（票 18 的标题）外零差异。

### 16. `.header-ticker` 死块删除 + 两条认知约束入文档
> Issue: #33

**Blocked by**: 01

**Delivers**：头部轮播只剩一条实现；后续会话不再把它当「缺 reduced-motion 的活动画」重复上报。

> 状态：已验收（7d1dbd4）@2026-09-22

- [x] 删除该死块与其关键帧、以及其在窄屏断点内的副本
- [x] AGENTS.md 头部轮播条补：实现只有主容器文本块与对应 init 函数
- [x] AGENTS.md 新增机制约束：Tailwind v3 的 `@layer` 是构建期指令、产物中不存在级联层，冲突按「特异性 → 源顺序」判定
- [x] 断言：**指纹零差异**；且全站该关键帧引用归零

**实施**：删 `.header-ticker` 整块 + `@keyframes ticker-scroll`（46 行）与窄屏 `display:none` 副本（3 行），共 49 行。AGENTS.md 两处：头部微言轮播条补「实现只有 `#header .text` + `initHeaderTicker()`，被删的 CSS-only 死块不要再当缺 reduced-motion 的活跃动画上报」；构建链段新增「Tailwind v3 `@layer` 是构建期指令、产物里 `grep -c '@layer'` 为 0，冲突一律按特异性→源顺序」，并把本仓库**两处**据此误判的历史结论（根字号、`.prose code`）列进去。

**证据**：缝隙 A `全站没有任何元素还在跑被删的 ticker 关键帧 :: 引用数=0`，且 `头部微言轮播仍在轮转`（首条 4.8s 后确实换成下一条）——活实现未受删除影响。删除影响面由缝隙 B 的零差异承担（见 T2 汇总）。诚实标注：那条「引用数=0」是负向扫描，被删的是零标记匹配的 CSS-only 块，**改前改后都采不到动画、不可能变红**，真正守卫是零差异指纹，判据文案已这么写。

### 17. 断点 no-op 清理与弹窗视口单位
> Issue: #34

**Blocked by**: 01

**Delivers**：一处无效的网格声明消失；移动端弹窗不再依赖被地址栏吃掉的视口高度。

> 状态：已验收（82b9ce7）@2026-09-22

- [x] 删除窄屏断点内那条无效的网格列声明（其宿主本就是块级布局）
- [x] 弹窗最大高度改为同时兼容旧浏览器的视口单位写法
- [x] 明确不动 680/681 边界（经核实自洽）与 768 双断点（分工不同，合并属重构、另案）
- [x] 断言：弹窗在移动端模拟视口下底部控件可达
- [x] 断言：桌面与 681–1100px 布局零变化

**实施**：删 `@media (max-width:768px)` 里的 `.main-grid{grid-template-columns:1fr}`——`getPaginationUrl` 无关，成因是 `.main-grid` 的基础声明为 `display:block`（源顺序晚于层内那条 `display:grid`、同特异性胜出），网格列对它无效；判据不写「源码里没这行」，而写「宿主计算 display 为 block 且正文列占满容器」。弹窗按 Q42-B 落 `max-height: min(80vh, 80dvh)`，并在它**前面保留一条 `max-height: 80vh`**：`min()` 内含引擎不认识的 `dvh` 时整条声明失效，若无前一条就成了「完全没有 max-height」，那才是 Q42-B 要避免的赌注。

**⚠️ 一次判据自我修正（评审抓出，我原本写的会假绿）**：首版只量「面板与底部控件是否在可视区内」，而 390×640 下弹窗内容仅约 224px，`max-height` 根本不参与布局——把修复改回旧值、甚至两条全删，面板底边仍是 400，断言照绿。改为**以计算值本身作判据**：`max-height=512px`，须 ≤ 视口高 80%（512px）**且**严格低于旧阈值 `calc(100vh-32px)=608px`——旧值 608 会被直接拒掉，这才叫有判别力。同批把「取 DOM 末位控件」改成「取几何最低控件」，并把自拼中文字符串的正则匹配换成两个数字直接比。

**范围外扩一处，如实记**：`80vh/80dvh` 对**桌面**也是一次真实阈值变化（900px 窗口下 868px→720px），票面只写「移动端」。已按 Q42-B 落地并在样式注释里写明理由，站长如认为桌面不该变，改回只需那条 media 限定。

### 18. 404 页标题与分页元数据
> Issue: #35

**Blocked by**: 01

**Delivers**：读屏用户能在 404 页用标题导航；分页页不再共用同一条描述与标题。

> 状态：已验收（beed143）@2026-09-22

- [x] 404 页补一个真正的标题元素
- [x] 列表页与热门分页的标题/描述带页码区分
- [x] 断言：404 页顶级标题数 = 1
- [x] 断言：第 2 页起的标题与描述与第 1 页不同

**实施**：`404.astro` 补可见 `<h1 class="title">页面未找到</h1>`（该页此前整页只有 `div.code` 与 `div.msg`，无任何标题；`.error-404 .title` 显式压掉 UA 默认外距只留下 10px 下距，居中版面未被顶开）。分页侧新增 `src/utils/pagination.ts` 的 `getPageMeta(base, current)` 一处实现，五个分页路由（首页 `/page/N`、`/hot/page/N`、`/tag/x/page/N`、`/category/x/page/N`、`/archive/y/m/page/N`）统一改用它：第 1 页原样返回，第 ≥2 页标题加 ` · 第 N 页`、描述加 `（第 N 页）`。

**过程中修掉两个自己造成的问题**：① 首页路由最初把 base.title 填成 `siteConfig.title`，而 Layout 还会再拼一次「 - 站名」，第 2 页就成了「站名 · 第 2 页 - 站名」——改 base 为「最新文章」后读数为 `最新文章 · 第 2 页 - WindowsIt's Music Club`。② 评审指出元数据断言缺 HTTP 状态门：若哪天某列表只剩 1 页，`/page/2/` 落 404、标题自然「不同」，判据会假绿——已补「第 2 页确为 200」一条。

**证据**：缝隙 A `404 页恰好一个可见 h1 且在正文容器内 :: status=404 h1=["页面未找到"] inMain=true`；`第 2 页确为 200 :: /=200 /page/2/=200 | /hot/=200 /hot/page/2/=200`；`第 2 页的标题与描述都与第 1 页不同`（两条列表均成立）。`getPageMeta` 补了两条 `node --test` 单测（第 1 页原样返回、第 ≥2 页 title/description 都带页码且互不同形），`test:utils` 由 14 增至 16 全过。缝隙 B：404 页新增 1 个节点 + 容器高度 395→436px，其余 23 页零差异。

### 19. 文档失真更正批
> Issue: #36

**Blocked by**: 无（纯文档，可与任何代码票并行，但按 Q50-C 单独停下预览）

**Delivers**：AGENTS.md 与 README 不再包含会被据此误判的陈述。

> 状态：已验收（fc5f7fc，纯文档 commit）@2026-09-22

- [x] 更正：版本自相矛盾（技术栈行与销项记录冲突）
- [x] 更正：行内代码条的媒体查询归因（实为构建期分层块内、桌面一直生效；覆盖关系由特异性决定）
- [x] 更正：阅读模块书目数量与静态页数（实测远大于文档值，含数据文件头注释）
- [x] 更正：药丸样式的行号引用；ADR 计数
- [x] 更正：两份命令清单互有缺漏；两个冒烟脚本的默认端口与权威环境说明统一
- [x] 更正：依赖范围写法与已安装版本不一致的一处
- [x] 新增写作约定：约束以选择器与路径为锚点，行号仅作辅助且必须标「约」
- [x] 补一句独立壳阅读模块的文字尺寸契约适用域（装饰字形不受「辅助文字 ≥13px」约束），关闭审计里的一个假阳性
- [x] 带日期的历史实测数字保留原样；无法本地复核的（图种数量、历史构建文件数）标注 UNKNOWN 或不作改动依据
- [x] 不改动 vendored 样式表与参考用原版样式文件

**逐条落地**（每条都重新实测，未沿用登记册的数字）：README 技术栈 `Astro 5.16` → `6.4.8`（README 自己 176 行就记着 5→6 已完成，属内部自相矛盾）；content layer 警告改为「Astro 5 与 6 皆有此行为，本站在 6.4.8 复现」；`.prose code` 那条**两处错一起改**——它既不在 `@media (max-width:680px)` 内、也不是「桌面永不生效」，而是在层内且桌面一直生效，盖不住行内代码的原因是特异性 `(0,1,2) > (0,1,1)` 而非源顺序；书目数 22 → **70**（`id:`/`author:`/`},` 三向计数一致，`/books/:id/` 产物实测 70 个详情页），`books.ts` 头注释同步；药丸样式改用选择器锚点并写明「上一版行号记录漂了约 220 行」；ADR `现仅 0001` → `0001–0004 共四份`；AGENTS 补 `test:utils`/`test:friend-icons`/`smoke:ai-news`/`qa:nice-books-geometry`，README 补 `test:contributions`/`test:site-stats`/`smoke:ui` 并逐条写实际默认端口（实测：`smoke:nice-books`/`smoke:ai-news`/`qa:nice-books-geometry` 默认 4321，`test:fancybox` 默认 4322）；`@swup/astro` 实装 1.8.0 而 `package.json:44` 仍声明 `^1.7.0` —— **只记录不改范围**：pnpm lockfile 存的是 specifier，动 `package.json` 不动 lock 会让 CI 的 `pnpm install --frozen-lockfile` 直接失败；新增「文档写作约定」三条；设计契约补适用域。**未动** `src/styles/font-awesome.css` 与 `docs/reference/colorful-original.css`。

**⚠️ 本票自己制造过两条新失真，被标准轴评审抓出并当场改掉**（一条「文档更正批」反而写入不实陈述，性质比原缺陷更糟）：
1. 契约适用域最初写「`grep 0.85em` 零命中、该写法已不存在，唯一豁免项是 SiteHeader/SiteFooter 的 `text-[15px]` ✦」——**两句都错**：`text-[0.85em] text-nb-seal` 仍在 `src/pages/books/index.astro:51` 与 `:103`（我把 grep 只跑在 `src/nice-books/` 就下了全站结论；14px×0.85=11.9px 与原审计精确对上，说明审计本来是对的），而 15px 的 `✦` 达标、根本不需要豁免。净效果是「豁免给了不需要的人，需要的人被宣布不存在」。已按实测元素重写，并写明「`text-nb-seal` 用在 `No.${id}` 上是真内容、不豁免」。
2. AGENTS 新增的 `qa:nice-books-geometry` 一行写成「默认 4322」，而它默认 `127.0.0.1:4321`（4322 属于另一个脚本 `nice-books-design-qa.mjs`）——恰好又违反同批立下的端口统一说明。已改，并在行内点明两个脚本的区别。
教训：**为文档立「以选择器/路径为锚点」规矩的同一批里，我自己两次用了不完整的检索范围下全称结论**——凡写「不存在 / 唯一 / 全部」必须给出检索范围与命中数。

**顺带记两处既存问题（非本票引入、未改）**：`docs/agents/triage-labels.md:3-11` 仍把五个标签串称作「本仓库实际使用」，而 AGENTS.md 结尾正指向该文件（本次只改了 AGENTS 侧，两边目前不一致）；`global.css` 里有一条只含注释的空规则 `.prose :not(pre) > code[class*="language-"]{}`，属票 13「全死规则」的漏网（压缩期会清掉，无运行时影响）。

**T2 批次验证汇总（基线 = 票 08 补漏后的 `output/fp-after-t08fix`）**
- 缝隙 A `pnpm smoke:ui` 由 68 项增至 **78 项全绿**（票 15 +1、16 +2、17 +3、18 +3，另 1 项为状态门）。逐条先红后绿或经判别力检验
- 缝隙 B：**票 15/16/17 的正确结果就是零差异**——24 页中只有 `/404` 一页因票 18 新增标题而变化（多 1 个节点、容器高 395→436px），其余 23 页逐条零差异；两套比对（顺序无关多重集 + 槽位对齐）互验
- **新发现的采集噪声源（记录，未改）**〔**2026-09-22 复核后本条理由已更正，见下方「T3 前置实测」第 ① 项**〕：`/ai-news/` 在**两次都没有触碰该模块**的连续采集中给出同一 −7/+9（顶栏前后翻按钮与日期徽章的有无随远端 RSS 成败变化）。它不是 T2 回归，但该页现未列入 `WIDGET_ROOTS` 排除表——若 T3 之后再要以零差异为门禁，需先把它排除，否则门禁会随机翻脸

- 两轴评审（Standards / Spec 并行子代理，本次跑 Standards 轴）回收 8 项并已改：H1 契约两处我写入的新不实、H2 AGENTS 端口写错、M1 弹窗断言零判别力（改判据形态）、M2 元数据缺状态门、M3 `getPageMeta` 无单测（补 2 条）、M4 JSDoc 把只对首页成立的前提通则化、L2 重复注释、L4「归零」措辞与 `0 0 10px` 不符。评审同时核实：AGENTS 只读段未触碰、`deploy.yml`/vendored 样式零改动、未新增第四种初始化轨道、T2 断言无一处锁 CSS 源文本或行号、被删的三条 CSS 在 `src`/`public`/`scripts`/文章 Markdown/`dist` 产物内均零残留引用
- 既有套件：`astro check` 0 error / 0 warning、`test:utils` 16/16（含新 2 条）、`test:nice-books` 51/51、`test:friend-icons` 32/32、`test:projects`、`test:site-stats` 15/15、`test:contributions` 11/11 全 0 fail、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9、prettier 全绿
- **一处未过的既有环境项（2026-09-22 已补跑转绿）**：`test:fancybox` 首轮未能跑完——它 `waitUntil:"load"` 要等文章内嵌的 `github.com/*.png` 头像，实测该域名 21 秒后 `http=000`（同批 `api.github.com` TLS 握手要 15 秒，gh CLI 因此超时）。本地页面本身 0.03 秒返回 200，故**不是 T2 回归**；当时记为「未验证」而非「通过」。今天余下验证改走 `curl + $(gh auth token)` 打 REST 以绕开 gh 的 TLS 超时。**补跑**：`github.com/CaiYan12.png?size=128` 恢复 200 / 1.1 秒，对同一份 T2 产物（`FANCY_BASE_URL=http://localhost:4399`，即跑通 `smoke:ui` 81/81 的那次 build）重跑 → **27/27 全 0 失败**，含此前最关心的两项放大读数 `适配 595px → 放大 3072px`、`放大 3072 / 原图 3072`（顶部留白未把放大态压回适配尺寸，见 AGENTS.md「灯箱顶部净空常置」条），全程无本地资源请求失败、无 console/page 报错，仅 `giscus.app` 记为外部服务 NOTE（不计失败）。结论：本票未触碰灯箱，T2 对 fancybox 零回归，此前的「未验证」已消除
- **未验证项**：`80dvh` 在真实移动浏览器（地址栏伸缩）下的表现——Playwright 里 `dvh === vh === innerHeight`，只能证明「阈值确已低于旧值」，证明不了「地址栏缩起时不跳」；弹窗在 iOS Safari 的回落路径未测

**T2 交付（2026-09-22 站长预览「通过」后按票拆 commit）**
- 逐票 sha：票 15 `cfa2acd`、票 16 `7d1dbd4`、票 17 `82b9ce7`、票 18 `beed143`、插-2 `685a013`、票 19（文档）`fc5f7fc`；本票册回填为紧随其后的一个 commit
- 站长裁决：票 17 那条桌面阈值外扩（900px 窗口 868→720px）**接受**，不限定回移动端
- 切分保真证明：三份跨票文件（`global.css` / `AGENTS.md` / `scripts/ui-smoke.mjs`）按 hunk 与票内注释边界重建逐票中间态，`output/t2-split.mjs` 三闸全过（hunk 归属唯一、末态逐字节复现工作树、每份 ui-smoke 中间态 `node --check` 合法）；提交后工作区只剩本票册，且 `git diff` 对修正前那组 commit 的树**零差异**
- **拆 commit 自己踩过的一次错分（记录）**：首版驱动把 `ui-smoke.mjs` 当「整文件 add」处理，于是票 15 的 commit 带走了 16/17/18/插-2 的断言，后续四票里该文件反而零改动。内容无误、只是历史切分错位，`git reset --mixed`（不动工作树）后改走中间态重跑，六票边界复验为「每票只含本票断言」。教训：**跨票共享文件一律走重建中间态，`git add <file>` 只适用于与单票 1:1 的文件**
- 中间 commit 的一致性是按构造保证的（累计态 + 语法合法），并未逐票 checkout 跑构建；实际执行过的绿判据是整个批次末态那一份
- **上线生效核验（对产物而非对本地）**：三条工作流在 `00dcaf9` 全绿（Lint / Build and Check / Deploy），`Last-Modified: Tue, 22 Sep 2026 09:19:48 GMT` 与部署完成时刻对齐。逐页抓 `/_astro/*.css` 与 HTML 做内容断言 **15/15**：CSS 内 `html{font-size:13px}` 与 `header-ticker`、`ticker-scroll` 命中均为 0、`100%` 基线仍在、`.main-grid` 网格声明已删、404 文档确为 404 且 h1 唯一、`/page/2/` 与 `/hot/page/2/` 标题描述均带页码且区别于第 1 页、搜索框 `outline-offset:-2px` 与按钮关环转深在产物里都在。随后把整条缝隙 A 冒烟以**线上**为基准复跑 **81/81**



**T2 批次停止点** → 代码票交预览、文档票单独交审阅。**站长 2026-09-22 判「通过」**（含插-2 与票 17 的桌面阈值外扩），已按票拆 commit 并 push。

## T3 · 对比度与品牌让步

### T3 前置实测（2026-09-22 站长选乙法之后做的一轮测量，未改任何站点代码）

**① 缝隙 B 基线重置，并更正 T2 里关于 `/ai-news/` 的那条理由**
- 从 `d0e5be3` 先删 `node_modules/.astro` 与 `.astro/data-store.json` 再重建（`pnpm exec astro build` + 补回 pagefind 与横幅，`src/constants` 未脏）。同一份 dist **连采两遍 24 页逐字节零差异**（`output/fp-t3-a` ↔ `fp-t3-b`），其中 `/ai-news/` 两次同为 277 元素、同 sha `74c0e5700ee5d94d`。
- 该页实测处于**健康态**：`daily.juya.uk/rss.xml` 200、当日 10 篇早报、封面图全加载、console 零错误。
- ⇒ 本票册上方「RSS 成败会让同码连采翻脸」**今天不可复现**，已就地标注。排除该页的真实理由是**内容为运行时按日拉取的远端 feed**：同一天内稳定，**跨天采集必然合法地不同**（T3 会跨天）。采集脚本的 `Math.random` 种子只压得住客户端随机（`/books/` 当日选书即此类），压不住网络，故按**整页**排除而非按子树排除。`PAGES` 已移除该页，基线重采为 `output/fp-t3-base`（23 页），与已证稳定的 `fp-t3-a` 对拉 23 页逐字节一致。T3 三票均不触碰这个独立壳（不引 `Layout` 与 `global.css`），排除不损失覆盖面。

**② 票 20 的选型由实测定案：走「线」，不走字重**
- 12 页共量 **1381 个可见 `<a>`**：`text-decoration:underline` 的宽度位移**全部为 0**（非零项 0），行盒高度位移亦全为 0；`font-weight:700` 让 **383 个（28%）加宽**，绝对最坏 **10.41px**（文章页拉丁内联链接）、相对最坏 **6.1%**（侧栏「JUFE Offer」Δ3.59/59.22），高度不变。
- 票面原假设「导航项最敏感」**被量成反例**：`#menu-index > li > a` 是 `width:110px` + `box-sizing:border-box` 定宽项，7 项全部 Δ0；整排同时变粗时末项右边缘 950→950、行高 55→55、零横向溢出。下拉子项同理（面板定宽 106px，实测 Δ0；静息 `display:none`，必须先显形才量得到）。
- 首页卡片标题族 Δ0 属**判据不适用**而非「安全」：它们是块级满宽盒（404–814px），字重不改盒宽，真实风险在**换行/回流转义**，需另设判据。
- ⇒ 非颜色辅助应用**不触发布局的线**（`::after` + `scaleY`），与插-1 已确立的同源做法一致；字重方案出局。

**③ 票 22 的范围与三对事实校正**
- 全站 z-index 共 **60 处**（`global.css` 40、`books.css` 8、`nutssss.css` 4、`markdown-extended.css` 3、`pio.css` 2、`site-toast.css`/`Layout.astro`/`SkillsOverview.astro` 各 1），票面「其余 22 个散值」对不上任何口径。
- **高值区只有 10 处 ≥999**，跨页压制关系全在此，「不动集合」可枚举而非估计：`10000000001 .skip-link`｜`10000000000 常驻播放器(!important)`｜`99999 .colorful_loading_frame`｜`10000 .site-toast`｜`9999 .click-word`｜`1000 ×2`｜`999 ×3`。
- 三对逐对复核：skip-link 与播放器差确为 **1**（票面成立）；`.click-word` 与 vendored Fancybox 容器**同为 9999**——票面「特效浮层高于灯箱」不准确，实为无契约的同值巧合，改法是**显式拉开**而非降低特效层；遮罩 99999 压住 toast 10000 成立（方向为遮罩在上）。

**④ 票 21 定案（乙法）与一处票面未预见的连带项**
- 站长选**乙法**：六格全保白字。可行解 `c1 #ee0028 / c2 #a26b00 / c3 #008944 / c4 #b12bff / c5 #4c3116 / c6 #0077da`，白字 4.50/4.53/4.50/4.51/**11.94**/4.52，两两最小 ΔE **44.45**（优于现状 41.29）。代价如实记：**棕色 c5 必须压成近黑**，且深压幅度远超 AA 所需——可辨性是用白字富余换来的。
- 我在会话中先说错、后由实测推翻的两条：(a)「乙法保不住只压亮度、必须动色相」——错，允许 ±12° 与 ±25° 色相带跑出的解完全相同，色相不是有用轴；(b)「c5 留原色 + 其余压暗」的混合路线——实测最小 ΔE 反而掉到 **13.9**，比六格都只压到达标的 16.01 更糟，路线不成立。
- 验收线写作：**白字六格均 ≥4.5 且两两最小 ΔE 不劣于现状 41.29**（ΔE 口径 = CIE76 全对最小值）。票面原写「远高于易混阈值」却从未定义阈值与口径，属票面缺陷，已按此补齐。
- **连带项（票面未预见）**：`.tag-count` 自带独立的 `color:#fff`（`global.css:3767`）。乙法下六格仍白字，本项不受影响；但若日后改走实测的支配解（**仅琥珀 c2 改黑字、其余五格轻压暗**：六格全达 AA、最小 ΔE **46.5**、棕色不必变近黑、五格明度仅动 0.02–0.06），该条必须同步跟随，且不得破坏 AGENTS.md 锁定的「`.tag-count` 与 `a.is-current` 必须保持在 nth-child 轮换规则之后」。


### 20. 绿色瞬时态补非颜色辅助
> Issue: #37

**Blocked by**: 01

**Delivers**：链接与导航项的状态变化不再只靠颜色传达；品牌绿 `#00c000` 一个像素都不动。

> 状态：已验收（767ed36）@2026-09-22

- [x] 先实测字重方案的宽度跳动（导航项与侧栏列表最敏感）　〔字重方案在 1381 个可见链接上实测：383 个（28%）加宽，最坏 10.41px／相对 6.1%；下划线全部为 0。导航项因 `width:110px` 定宽反而 Δ0——票面「导航最敏感」被量成反例〕
- [x] 按实测结果在下划线与字重之间选一种，并说明选择理由　〔取下划线／既有的 `::after` 线，字重出局〕
- [ ] 覆盖已核实的落点集合：全站链接 hover、下拉项 hover、侧栏 hover、卡片标题 hover、桌面菜单焦点态、头部文本块装饰伪元素
- [x] 断言：hover/focus 变化在非颜色通道上可感知　〔侧栏与卡片标题 `none → underline`；主菜单与下拉子项 `matrix(0,..) → matrix(1,..)`；键盘到达时线与焦点环同时在〕
- [x] 断言：文字宽度跳动不可见（或记录为已接受的代价并给出像素值）　〔四族悬停合计布局位移全为 0〕

### 21. 药丸背景 token 压暗
> Issue: #38

**Blocked by**: 01, 10

**Delivers**：六色药丸配白字全部达到 AA，色相家族与六色可辨性保持。

> 状态：已验收（563e14b）@2026-09-22

- [x] 先关闭二选一：琥珀色压到约 63% 亮度（实测边界 `#a16a00` = 4.59 / `#aa6600` = 4.56；`#b06900` 仅 4.32 不达标）还是单独给琥珀用黑字（现状黑字 10.93，是六色中唯一黑字远优于白字的一格）　〔站长 2026-09-22 判「乙法」〕
- [x] 只改六个 token 定义处，背景与三角标记同源于该组 token，一处生效五处共用 DOM 同步　〔`--tag-c1..c6` 六行，未新增色值规则〕
- [x] 不触碰 `nth-child` 六色轮换顺序、计数徽标、当前项的源顺序（AGENTS.md 锁定项）　〔指纹归因：439 处变化全部是 `background-color`、全部落在药丸锚点上，无第二个属性〕
- [x] 断言：六色配白字均 ≥4.5:1　〔实测 4.50／4.53／4.50／4.51／11.94／4.52〕
- [x] 断言：按亮度排序后最相邻色对的色差仍远高于易混阈值（实测 ΔE 由 61.6 → 50.7）　〔两两最小 ΔE 44.45 > 改前基线 41.29（阈值与口径见下方实现汇总，票面原文未定义）〕
- [ ] 预览：五处共用该 DOM 的页面同屏比对

### 22. z-index 三处真实风险 + 关系表入文档
> Issue: #39

**Blocked by**: 01

**Delivers**：三个可能反转的层级关系被拉开余量，且「谁必须位于谁之上」成为文档事实。

> 状态：已验收（bacbae1）@2026-09-22

- [x] 跳过链接与常驻播放器之间仅差 1 的层级余量修正　〔真实缺陷比「差 1」更糟：两个源值都超 int32，被静默钳成同一个 2147483647。现 skip=1000000 / player=900000，余量 100000〕
- [ ] 点击特效浮层不再高于灯箱
- [x] 加载遮罩与提示的上下关系修正　〔toast 10000 → 100100，已高于遮罩 99999；判据先真点 `[data-copy-message]` 把 toast 唤出再量〕
- [x] 其余 22 个散值不动（既定压制关系由文档锁定，全局重排风险大于收益）　〔全站实为 60 处（票面数字对不上任何口径）；本轮只动 3 个值，指纹里 20 处差异全是 `.skip-link` 的 `z-index`〕
- [x] AGENTS.md 新增一张「谁必须位于谁之上」关系表　〔已立于「样式」段，含 int32 钳位与 dialog 顶层层两条陷阱〕
- [x] 断言：灯箱打开时特效字与提示不覆盖其界面；键盘用户 Tab 首站仍可被聚焦到　〔命中测试通过；Tab 首站仍是 `.skip-link`，等 0.2s 过渡落定后 top=10、高 37〕


**T3 实现汇总（2026-09-22，未 commit，停在站长预览点）**
- 缝隙 A `pnpm smoke:ui` 由 81 项增至 **111 项全绿**（票 20 +13、票 21 +7、票 22 +7，含三条「无从比较即先证明前置成立」的门）。每票都先取红证据：票 21 改前白字读数为 3.97／1.92／3.16／4.32／3.88／3.52 全不达标；票 20 改前侧栏与卡片标题 `none → none`、主菜单 `matrix(0,..) → matrix(0,..)`
- 缝隙 B 分两段归因（基线 `fp-t3-base` → 票 21 后 `fp-t3-21` → 票 20+22 后 `fp-t3-2022`）：**票 21 的 439 处变化全部是 `background-color`、全部落在药丸锚点**（父级 `li`，文章页另有 4 处 `.post-tags`）；**票 20+22 合计仅 20 处、每页 1 处，全是 `a.skip-link` 的 `z-index: 2147483647 -> 1000000`**——旧产物算出的正是 int32 顶值，缺陷本身被印在证据里。票 20 对静息渲染**零漂移**，与「缝隙 B 不驱动 hover、这一票只能靠缝隙 A」的前置结论一致
- 全套复跑：`astro check` 0 error / 0 warning、`test:fancybox` 27/27、`smoke:nice-books` 72/72、`smoke:ai-news` 9/9、六组 `node --test` 0 fail、`prettier --check ./src ./scripts tailwind.config.cjs` 全绿
- **三处票面前提被实测推翻（都已按事实改做，不是照票面硬修）**：
  1. 票 22「点击特效浮层高于灯箱」不成立。`.fancybox__container` 计算 `z-index` 为 `auto`，且它挂在模态 `<dialog>` 里走**顶层层**——结构上任何 z-index 都盖不住它。我先前据 vendor CSS 里 `grep` 到的 `z-index:9999` 断定二者同值，是**把 grep 命中当成了规则归属**。故 `.click-word` 的改动**已回退**为 9999，改判据为命中测试（结果确实不覆盖）。
  2. 票 22「差 1」也不成立：两个源值都超 int32，算成同一个数，不是差 1。修法从「拉大余量」改为「都落回可表示区间」。
  3. 票 20「桌面菜单焦点态缺非颜色辅助」不成立，而且**我第一轮把纠正也写错了**：`#menu-index … :focus-visible::after` 与 `#nav li ul a:focus-visible::after` 早有展开线的规则；而 hover 那侧同样早就有 `@media (hover: hover) and (pointer: fine) { #menu-index > li > a:hover::after, #nav li ul a:hover::after { transform: scaleX(1) } }`（`4f0d678` 引入）。实测该媒体查询在 headless 与真实 Edge 下都匹配，所以**导航的 hover 线本来就在**，票面这一族整体无需改动。真正缺辅助的只有文字链接族（侧栏与卡片标题）。

     **这条纠正是怎么来的（教训比结论值钱）**：我第一轮给票 20 留的「红证据」里，导航那条读的是 `静息 matrix(1,..) → 悬停 matrix(1,..)`，我据此判定「hover 不展开」。但当时探针取的是 `#menu-index > li > a` 的**第一项**，而首页上它就是 `.current`——静息已然展开，`matrix(1)` 是它的常态而非「hover 无效」。换成 `:not(.current)` 后直接变绿，说明既有守卫规则一直有效，我加的两行是纯重复声明，且会把 hover 动效泄漏到无真悬停的设备（正是那块 `@media` 注释立誓要避免的事）。**已回退**（`global.css` 少两条选择器），111 项判据在回退后仍全绿，两条导航判据改作回归护栏并把文案改成事实。教训：**取红证据时必须确认探针落在能区分有无改动的元素上**——「读到期望失败的样子」不等于「证成了失败」，这一条与票 17 的「零判别力断言」是同一类错误。
- **实现期自查出的两个自伤（都已改）**：① `#sidebar a:hover` 那条聚合规则同样命中侧栏里的六色药丸（`#blogtags` 就在 `#sidebar` 内），会给药丸画上划线——已加 `#sidebar #blogtags a:hover{text-decoration:none}` 排除（双 id 特异性，不需 `!important`），并配一条守卫断言；② Tab 首站的可见性判据测在 0.2s `transition` 起点，读到 `translateY(-200%)` 误判成「skip-link 从未露出」——等过渡落定后实测 top=10，缺陷不存在，是我又一次把「没等待」当成「没生效」
- 验收线补齐：票 21 的「远高于易混阈值」原文无定义，现写作 **白字六格均 ≥4.5 且 两两最小 ΔE（CIE76 全对最小值）≥ 改前实测 41.29**；比较两侧精度必须一致（曾拿未取整值去比两位小数记录值，把「与现状相同」判成劣化）
- **站长 2026-09-22 判「已确认所有改动可以接受」**：乙法代价（c5 压成 `#4c3116` 近黑）与四族 hover 线/下划线全部转正，不再回到「仅琥珀改黑字」那个支配解。

**T3 交付（2026-09-22 按票拆 commit）**
- 逐票 sha：chore(qa) 指纹页表 `b07d20c`、票 20 `767ed36`、票 21 `563e14b`、票 22 `bacbae1`；票册回填为其后的 docs commit。票 22 一并带走 `site-toast.css`、`Layout.astro` 与 AGENTS.md 关系表
- 切分保真：`global.css` 与 `ui-smoke.mjs` 跨三票，按 hunk 行号显式指派与票内横幅再切，`output/t3-split.mjs` 三闸全过（hunk 归属唯一且 GMAP 双向全覆盖、末态逐字节复现工作树、每份 ui-smoke 中间态 `node --check` 合法）；提交后工作区只剩本票册，且逐票复验为「每票只含本票断言、只含本票 CSS 行」（票 20 +12、票 21 +8−6、票 22 +1−1）
- 中间 commit 的一致性由构造保证（累计态 + 语法合法），未逐票 checkout 跑构建；实际执行过的绿判据是整个批次末态那一份（smoke:ui 111/111）

**T3 批次停止点** → 预览；三项中任何一项被否决都不影响已合并批次。

## 批次外的插入修复

### 插-1. nav 右侧社交链接的底线：从「伪单向展开」改为真向上长
> 不在 23 张票内，站长 2026-09-21 预览期间口头插入

**现象（站长报）**：hover 时线看起来是上下双向展开 + 中心上移凑出的「向上展开」，实际线的底边会向上微小移动。

**实测根因**：`#head-nav .m-nav li a` 基态 `border-bottom:3px` + `padding:10px 0`，hover 改 `border-bottom-width:6px` + `padding-bottom:7px` 凑总高不变。逐帧采样（rAF 读 `getBoundingClientRect`）显示：锚点底边在 700ms 过渡里取 **14 个不同值**（229 → 228.94 → 228.83 → 228.66 → 228.97 → … 回落 229），盒高 43 → 42.14。原因是 Chrome 把 `border-width` 的插值**取整到整像素**（3→4→5→6），而 `padding` 是连续插值，两者中途对不上；又因 `li` 是 `align-items:center`，盒高每掉 1px，底边就被抬 0.5px。首末两端其实对齐（都 229），抖的是中间过程。

**改法**：线不再由 `border-bottom` 画，改 `::after`（绝对定位、`bottom:0`、`height:3px`、`transform-origin:bottom`），hover 用 `scaleY(2)` 长到 6px——不触发布局，底边由 `bottom:0` 天然钉住；锚点 `padding-bottom` 由 10 改 13（10 视觉内距 + 3 线高）以保持盒高与原来逐像素一致；链接色从 `border-color` 改为 `--mnav-line` 自定义属性（基态海洋绿 + 四家品牌色各一条）；`transition` 由 `all` 收窄为 `color`（`all` 正是把几何一起插值的源头）。

**连带必改的两处**：① 二维码弹层的 `top: calc(100% + 16px)` 原本含「+6px 边框补偿」（`100%` 当时是 padding box 底＝线顶），现在 padding box 底＝线底，改成 `calc(100% + 10px)`，实测 hover 时弹层与线底间隙仍是 10px；② 三条媒体查询里的 `#head-nav .m-nav li a { padding: 10px 0 }`（≤1100 / ≤980 / ≤860）原先与基态等值、纯冗余，如今会盖掉那 3px 线位，已同步为 `10px 0 13px`——这三条本身归票 13 的死规则清理另议。

**验收**：冒烟新增一条逐帧断言（`pnpm smoke:ui` 现 40 项全绿）——45 帧里底边唯一值 `229`、盒高唯一值 `43`、线高 `3→6`。红证据 = 同一测量通道对旧产物的采样（14 个底边值 / 盒高掉到 42.14）。原版对照：`colorful-original.css:109-110` 只改 `border-bottom-width`、不补 padding（靠 `float:left` 向下长），我们的居中盒不能照抄，故取其「线厚 3→6、颜色随品牌」的意图、换实现。

**指纹门禁的连带项**：该改动让 T0 比对多出 4 个链接 × 20 个主站壳页（`border-bottom-width 3px→0`、`padding-bottom 10→13`、新增 `::after` 背景为品牌色）；`output/fp-scan-navdelta.txt` 为改前/改后两次采集的差量清单。注：我的临时比对脚本把伪元素属性并进同一行，输出的 `a.bilibili background-color` 实为 `::after` 的值——浏览器直读已确认锚点本身 `rgba(0,0,0,0)`、仅伪元素着色。

### 插-2. 搜索页与 404 页搜索框：选中线贴回原边框
> 不在 23 张票内，站长 2026-09-22 附截图插入（原话：「修改搜索页与404的搜索框active线的位置，我希望它就在原边框上面表示当前已选中，就像主页右侧搜索框那样，按钮不需要」）

> 状态：已验收（685a013）@2026-09-22，站长预览「通过」后随 T2 一并提交

**根因（实测，非推测）**：全局焦点环是 `:where(a, button, input, textarea, select):focus-visible { outline: 2px solid …; outline-offset: 2px }`，`+2px` 让 2px 绿环落在输入框自身 1px 边框**外侧 2px**，于是观感是「两个框」；搜索页更严重，因为它聚焦时边框本身也变绿（`.search-panel input:focus-visible{border-color}` + Tailwind `focus:border-primary`），等于绿框 + 绿环双线。改前实测两处均为 `outlineOffset: 2px`。

**参照物的真实几何**：主页右侧搜索框是 `input{outline:0}` + 容器 `.sidebar-search-widget:focus-within::after{inset:0;border:2px solid}`（实测 `outline: none` / after `2px solid rgb(0,122,0)` / `inset 0`），即线带落在 `[edge-2px, edge]`，也就是**压在边框上**。单个元素要复现同一几何，等价写法就是 `outline-offset: -2px`。

**实施**：给 `.search-panel input:focus-visible` 与 `.error-404 .search-box input[type="text"]:focus-visible` 加 `outline-offset: -2px`；两处提交按钮按「按钮不需要」去掉环（`outline: 0`），但**同时**给它们补 `background: var(--primary-dark)` 的焦点态——只删环不补可见态就是 WCAG 2.4.7 的可达性回退，而这条正是本站 ADR-0004 条款二「可访问性硬失败无条件修」的范围，也沿用侧栏按钮既有的同款做法。

**证据**：`pnpm smoke:ui` **81/81 全绿**，本插入项 2 条——
- `/search/ 2px solid offset=-2px | /this-page-should-404/ 2px solid offset=-2px`（环仍实心 ≥2px，票 05 的「有可见焦点环」判据不回退；offset 由 +2 变 −2 即线已贴边）
- 按钮：`抵达=true rgb(0,122,0) → rgb(0,170,0)（环 none 0px）`、`rgb(0,192,0) → rgb(0,170,0)`——未聚焦时按钮保持原底色（实测 `rgb(0,192,0)`），Tab 抵达才转深
- 像素侧另用真实截图复核（计算值相同而像素不同的教训在本轮已踩过一次）：改前图可见「框 + 框外绿环」，改后为单条压边绿线，按钮未误变深

**顺带澄清一处非缺陷**：搜索页按钮看着比 404 的暗，是它自己的既有配色（`bg-primary` → `rgb(0,122,0)`）与 404 的 `var(--primary)`（`rgb(0,192,0)`）不同，本插入项未改。

## 收尾

### 23. 全链验证与交付
> Issue: #40

**Blocked by**: 01–22 全部

**Delivers**：本地全链绿、远程部署可证生效、票册状态全部回填。

> 状态：未开始（T0 段已完成，本票随整轮收尾）

**T0 段进度（2026-09-21）**：T0 全批已 commit 并 push（`3a798dc..df2e43c`）；三条工作流在 `df2e43c` 上全绿（Lint 26s / Build and Check 31s / Deploy 1m54s），站点 `Last-Modified: Mon, 21 Sep 2026 11:50:08 GMT` 与部署完成时刻对齐；整套冒烟以**线上**为基准复跑 43/43（含 nav 底线的像素判据）。镜像 issue #18-#24 已逐条留言并关闭，父票 #17 未动。
**「收尾一次全链」目前由 CI 覆盖**：`deploy.yml` 的 `withastro/action` 执行 `pnpm build` 全链且 `cache:false` 保证 content layer 不陈旧。本地未重复跑全链 —— 会弄脏 `src/constants/*.json` 与 `site-stats.json` 并与并发会话撞车；票 23 关闭前若需本地产物级证明，再单独跑一次并回收数据文件改动。

- [ ] 删 content layer 缓存后完整 `pnpm build` 通过
- [ ] `pnpm check` 零错误、`prettier --check ./src` 通过
- [ ] 既有全部冒烟与单测绿（灯箱、好书、日报、工具函数、项目、书籍、统计、友链图标）
- [ ] 改后指纹与基线比对报告归档到证据登记册
- [ ] 一项一 commit 已按票序落地；push 与 Pages 部署验证按站长指示执行（线上以 `Last-Modified` 或 Actions artifact 判定，勿凭刷新可见）
- [ ] `.design-flow.json` stage 与 next 更新

> 状态：已验收（bd9ee72）@2026-09-21
