/**
 * 语录条语料。元件见 src/components/layout/QuoteBand.astro，
 * 客户端逻辑见 src/utils/theme-script.ts 的 initQuoteBand()，
 * 每条的一手出处与年份见 docs/quotes-review.md（不下发到客户端）。
 *
 * 每行一条：[英文原句, 中文译文, 署名]。中文译文全部由本站自译。
 *
 * 收录口径一：宁缺毋滥。署名会直接显示给访客，所以只收能追到一手出处
 * （论文 / 书 / 演讲 / 访谈）的句子；出处存疑的列进审校文件的待核表，
 * 追不到一手文本的常见句子列进「未入语料」表，不得回加。
 *
 * 收录口径二：整带高度是闸门，不是字数。站长 2026-09-30 裁决把 Hoare（214 字符）与
 * Kernighan（178 字符）放回，桌面封顶随之从 132px 放宽到 **160px**、手机到 **260px**。
 * 实测 42 条的全量包络：1440/1100/860 最高 153.4px，680 最高 156.7px，390 最高 251.4px
 * （都是 Hoare 那条）。英文长度因此以 220 字符为硬上限——它只挡"塞一段段落进来"，
 * 真正约束版面的是 pnpm smoke:ui 里那条逐条量高度的判据。
 * 其余 5 句被长度挡下的名句仍留在 docs/quotes-review.md 的「长句备选」表里。
 *
 * 本文件随仓库跟踪、不参与 pnpm build 生成；改这里就是改站点内容。
 */
window.__quoteCorpus = [
	[
		"Premature optimization is the root of all evil.",
		"过早优化是万恶之源。",
		"Donald Knuth",
	],
	[
		"Program testing can be used to show the presence of bugs, but never to show their absence!",
		"程序测试能证明错误存在，永远不能证明错误不存在。",
		"Edsger W. Dijkstra",
	],
	[
		"The quality of programmers is a decreasing function of the density of go to statements in the programs they produce.",
		"程序员的质量，随其程序里 go to 语句的密度递减。",
		"Edsger W. Dijkstra",
	],
	[
		"Simplicity is prerequisite for reliability.",
		"简洁是可靠的先决条件。",
		"Edsger W. Dijkstra",
	],
	[
		"There are two ways of constructing a software design: one way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies.",
		"构造软件设计有两条路：一条是简单到显然没有缺陷，另一条是复杂到看不出缺陷。",
		"C. A. R. Hoare",
	],
	[
		"Adding manpower to a late software project makes it later.",
		"往延期的项目里加人，只会让它更晚。",
		"Fred Brooks",
	],
	[
		"Plan to throw one away; you will, anyhow.",
		"计划扔掉一个版本吧，反正你迟早会扔。",
		"Fred Brooks",
	],
	[
		"The hardest single part of building a software system is deciding precisely what to build.",
		"造一个软件系统最难的一步，是想清楚究竟要造什么。",
		"Fred Brooks",
	],
	[
		"I suppose it is tempting, if the only tool you have is a hammer, to treat everything as if it were a nail.",
		"如果你唯一的工具是锤子，你会把一切都当成钉子。",
		"Abraham Maslow",
	],
	[
		"Any sufficiently advanced technology is indistinguishable from magic.",
		"任何足够先进的技术，都与魔法无异。",
		"Arthur C. Clarke",
	],
	[
		"Perfection is achieved, it seems, not when there is nothing more to add, but when there is nothing left to take away.",
		"完美，似乎不在于无可增加，而在于无可删减。",
		"Antoine de Saint-Exupéry",
	],
	[
		"The first principle is that you must not fool yourself — and you are the easiest person to fool.",
		"第一原则是别骗自己，而你是最容易被骗的那个人。",
		"Richard Feynman",
	],
	[
		"What I cannot create, I do not understand.",
		"我造不出来的东西，我就没有懂。",
		"Richard Feynman",
	],
	[
		"The purpose of computing is insight, not numbers.",
		"计算的目的在于洞见，不在于数字。",
		"Richard Hamming",
	],
	[
		"The good work you do will be influenced by what you think is important.",
		"你做得好的那部分工作，会被你眼中重要的事所左右。",
		"Richard Hamming",
	],
	[
		"Programs must be written for people to read, and only incidentally for machines to execute.",
		"程序要写给人读，只是顺便让机器执行。",
		"Abelson & Sussman",
	],
	[
		"Given enough eyeballs, all bugs are shallow.",
		"眼睛够多，bug 便无处遁形。",
		"Eric S. Raymond",
	],
	["Release early, release often.", "早发布，勤发布。", "Eric S. Raymond"],
	[
		"Talk is cheap. Show me the code.",
		"空谈无益，把代码给我看。",
		"Linus Torvalds",
	],
	[
		"A language that doesn't affect the way you think about programming is not worth knowing.",
		"一门不影响你思考编程方式的语言，不值得学会。",
		"Alan J. Perlis",
	],
	[
		"Simplicity does not precede complexity, but follows it.",
		"简洁并不先于复杂，而是走在复杂之后。",
		"Alan J. Perlis",
	],
	[
		"Be liberal in what you accept, and conservative in what you send.",
		"接收时宽厚，发送时保守。",
		"Jon Postel",
	],
	[
		"We should expect our customers to know what they are doing, and not protect them from themselves.",
		"我们该假定用户知道自己在做什么，而不是处处替他们兜底。",
		"M. D. McIlroy",
	],
	[
		"Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.",
		"调试比写代码难一倍。所以若你已竭尽聪明去写它，按定义你就没聪明到能调试它。",
		"Kernighan & Plauger",
	],
	[
		"Algorithms + Data Structures = Programs",
		"算法 + 数据结构 = 程序。",
		"Niklaus Wirth",
	],
	[
		"Software is getting slower more rapidly than hardware becomes faster.",
		"软件变慢的速度，快过硬件变快的速度。",
		"Niklaus Wirth",
	],
	[
		"All problems in computer science can be solved by another level of indirection.",
		"计算机科学里的所有问题，都能靠再加一层间接解决。",
		"David Wheeler",
	],
	[
		"There are only two hard things in Computer Science: cache invalidation and naming things.",
		"计算机科学里只有两件难事：缓存失效和命名。",
		"Phil Karlton",
	],
	[
		"Any application that can be written in JavaScript, will eventually be written in JavaScript.",
		"任何能用 JavaScript 写的应用，最终都会用 JavaScript 写。",
		"Jeff Atwood",
	],
	[
		"The best code is no code at all.",
		"最好的代码是一行代码都不写。",
		"Jeff Atwood",
	],
	[
		"Complexity is anything related to the structure of a software system that makes it hard to understand and modify.",
		"复杂度就是软件结构里一切让人难以理解、难以修改的东西。",
		"John Ousterhout",
	],
	[
		"The best way to predict the future is to invent it.",
		"预测未来最好的办法，是把它造出来。",
		"Alan Kay",
	],
	[
		"Simple is better than complex. Complex is better than complicated.",
		"简单胜过复杂，复杂胜过混乱。",
		"Tim Peters",
	],
	["Readability counts.", "可读性算数。", "Tim Peters"],
	[
		"Errors should never pass silently. Unless explicitly silenced.",
		"错误绝不该悄悄溜过，除非你明令它闭嘴。",
		"Tim Peters",
	],
	[
		"Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
		"傻子也能写出机器读得懂的代码；好程序员写的是人读得懂的代码。",
		"Martin Fowler",
	],
	[
		"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.",
		"同一份知识，在一个系统里只能有一处、明确、权威的表示。",
		"Hunt & Thomas",
	],
	[
		"Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.",
		"写代码时永远假设：接手维护的人是个知道你住哪儿的暴躁疯子。",
		"Martin Golding",
	],
	[
		"A complex system that works is invariably found to have evolved from a simple system that worked.",
		"能跑起来的复杂系统，无一例外是从一个能跑起来的简单系统演化来的。",
		"John Gall",
	],
	[
		"We can only see a short distance ahead, but we can see plenty there that needs to be done.",
		"我们只能看清不远的将来，但那里已经有够多的事要做。",
		"Alan Turing",
	],
	[
		"You can't tell where a program is spending its time, because the program is not doing what you think it is doing.",
		"你猜不到程序把时间花在哪，因为它跑的并不是你以为的那件事。",
		"Rob Pike",
	],
	[
		"Build-aided programming is no substitute for thinking while programming.",
		"再好的构建工具，也替不了编程时的那点思考。",
		"Rob Pike",
	],
];
