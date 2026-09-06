/**
 * Nice Books V1 数据层（单一真相源）
 * ------------------------------------------------------------
 * 22 本 V1 fixture 迁移自原型 prototype/assets/js/data.js（书目为公知信息，
 * 版次年份取常见通行版本，仅作排版演示，见 design-handoff.md §12.2）。
 *
 * 校验策略（主提示词 §44：build/dev 期尽早失败）：
 * 模块顶层执行断言，任何字段不合法直接抛错 —— dev 启动、astro build（getStaticPaths
 * 导入本模块）、单测三条路径都会立即失败。
 */

import type { Book } from "../types";

const BOOKS: Book[] = [
	{
		id: "01",
		title: "百年孤独",
		author: ["加西亚·马尔克斯", "范晔 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2011, edition: "第一版" },
		coverUrl: null,
		description:
			"布恩迪亚家族七代人的传奇，马孔多小镇百余年的兴衰。魔幻与现实在此交织，孤独如宿命一般笼罩着每一个人。",
		recommendationReason:
			"第一次读完是在大学宿舍，合上书那天窗外正好下大雨。此后每年都会重读一遍，每次都会在新的地方停下来。",
		tags: ["文学", "小说", "外国文学", "经典"],
		featured: true,
	},
	{
		id: "02",
		title: "围城",
		author: ["钱锺书"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1991, edition: "第一版" },
		coverUrl: null,
		description:
			"钱锺书唯一的长篇小说。围在城里的人想逃出来，城外的人想冲进去——婚姻也罢，职业也罢，人生的愿望大都如此。",
		recommendationReason: "隔几页就忍不住划一句的奇书。讽刺得刻薄，又刻薄得让人发笑。",
		tags: ["文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "03",
		title: "三体",
		author: ["刘慈欣"],
		publisher: "重庆出版社",
		firstEdition: { year: 2008, edition: "第一版" },
		coverUrl: null,
		description:
			"一次绝密军事项目，让地球文明与三体文明有了第一次接触。一部硬朗、宏大而冷酷的中国科幻史诗。",
		recommendationReason: "读完抬头看夜空的心情很难描述。国产科幻天花板，没有之一。",
		tags: ["科幻", "小说"],
		featured: true,
	},
	{
		id: "04",
		title: "活着",
		author: ["余华"],
		publisher: "作家出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"地主少爷福贵嗜赌成性，终于赌光了家业。此后内战、饥荒、动荡接踵而至，身边的亲人一个个离去，而他依旧活着。",
		recommendationReason: "薄薄一本，两小时就能读完，但接下来两天会一直想着它。",
		tags: ["文学", "小说"],
		featured: true,
	},
	{
		id: "05",
		title: "小王子",
		author: ["安托万·德·圣埃克苏佩里", "周克希 译"],
		publisher: "华东师范大学出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"飞行员在撒哈拉沙漠遇见了来自 B-612 星球的小王子。一本写给大人的童话，关于玫瑰、狐狸，和眼睛看不见的东西。",
		recommendationReason: "周克希的译本味道最对。不同年纪读，是三本不同的书。",
		tags: ["文学", "外国文学", "经典"],
		featured: true,
	},
	{
		id: "06",
		title: "万历十五年",
		author: ["黄仁宇"],
		publisher: "生活·读书·新知三联书店",
		firstEdition: { year: 1997, edition: "第一版" },
		coverUrl: null,
		description:
			"以万历十五年这个看似平淡的年份为切口，剖析大明王朝乃至整个传统中国的制度困局。「大历史观」的开山之作。",
		recommendationReason: "把历史写得像推理小说。读完再看任何古装剧都会走神去想制度问题。",
		tags: ["历史", "人文", "经典"],
		featured: true,
	},
	{
		id: "07",
		title: "呐喊",
		author: ["鲁迅"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1979, edition: "第一版" },
		coverUrl: null,
		description:
			"《狂人日记》《孔乙己》《阿Q正传》……新文学的第一声呐喊。一百年过去，书里的人仍然住在我们周围。",
		recommendationReason: "小时候背课文觉得他凶，长大重读才发现他最温柔。",
		tags: ["文学", "经典", "中国文学"],
		featured: true,
	},
	{
		id: "08",
		title: "边城",
		author: ["沈从文"],
		publisher: "人民文学出版社",
		firstEdition: { year: 2000, edition: "第一版" },
		coverUrl: null,
		description:
			"湘西茶峒的渡船上，翠翠和爷爷安静地生活着。一个关于等待的故事——这个人也许永远不回来了，也许明天回来。",
		recommendationReason: "适合夏天的傍晚读。文字干净得像溪水。",
		tags: ["文学", "小说", "中国文学"],
		featured: false,
	},
	{
		id: "09",
		title: "瓦尔登湖",
		author: ["亨利·戴维·梭罗", "徐迟 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2004, edition: "第一版" },
		coverUrl: null,
		description:
			"1845 年春天，梭罗带着一把斧头走进瓦尔登湖畔的森林，独自生活了两年零两个月。一本关于「如何生活」的实验记录。",
		recommendationReason: "焦虑的年头，随便翻开一页都能安静下来。徐迟译本依然是最好的。",
		tags: ["散文", "外国文学", "自然"],
		featured: true,
	},
	{
		id: "10",
		title: "局外人",
		author: ["阿尔贝·加缪", "柳鸣九 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2010, edition: "第一版" },
		coverUrl: null,
		description:
			"默尔索在母亲的葬礼上没有流泪，后来因此被判处死刑。存在主义文学最锋利的一把刀。",
		recommendationReason: "很短，一个下午读完。但之后很长一段时间，你会被它盯着看。",
		tags: ["文学", "小说", "外国文学"],
		featured: false,
	},
	{
		id: "11",
		title: "月亮与六便士",
		author: ["毛姆", "傅惟慈 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2009, edition: "第一版" },
		coverUrl: null,
		description:
			"四十岁的伦敦证券经纪人突然抛下一切去了巴黎，理由只有一个：我必须画画。满地都是六便士，他却抬头看见了月亮。",
		recommendationReason: "每次换工作的念头冒出来，就会想起这本书。",
		tags: ["文学", "小说", "外国文学"],
		featured: true,
	},
	{
		id: "12",
		title: "红楼梦",
		author: ["曹雪芹", "高鹗 续"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1996, edition: "第一版" },
		coverUrl: null,
		description:
			"一块顽石、一株绛草，和一整个家族的盛衰。中国小说的绝对巅峰，也是一座读一辈子也读不完的园子。",
		recommendationReason: "不必多说。只提醒一句：别从第一回的神话开始较真，先读下去再说。",
		tags: ["经典", "中国文学", "小说"],
		featured: true,
	},
	{
		id: "13",
		title: "城南旧事",
		author: ["林海音"],
		publisher: "中国青年出版社",
		firstEdition: { year: 2001, edition: "第一版" },
		coverUrl: null,
		description:
			"二十世纪二十年代的北京城南，小英子眼中的骆驼队、惠安馆，和爸爸的花儿落了。旧照片一样的童年。",
		recommendationReason: "冬天读会想喝一碗热豆汁儿。告别写得克制，反而最催泪。",
		tags: ["文学", "中国文学", "童年"],
		featured: false,
	},
	{
		id: "14",
		title: "平凡的世界",
		author: ["路遥"],
		publisher: "北京十月文艺出版社",
		firstEdition: { year: 2017, edition: "第一版" },
		coverUrl: null,
		description:
			"黄土高原上，孙少安与孙少平兄弟在时代变迁中各自挣扎、各自生长。一部厚重的中国当代生活全景。",
		recommendationReason: "三册很厚，但你会舍不得读完。写给每一个不肯认输的普通人。",
		tags: ["小说", "中国文学", "经典"],
		featured: true,
	},
	{
		id: "15",
		title: "白鹿原",
		author: ["陈忠实"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1993, edition: "第一版" },
		coverUrl: null,
		description:
			"渭河平原上白、鹿两家半个世纪的恩怨纠葛。一幅厚重苍凉的「民族秘史」长卷。",
		recommendationReason: "开篇第一句，就是中文小说里最惊人的开场之一。",
		tags: ["小说", "中国文学", "历史"],
		featured: false,
	},
	{
		id: "16",
		title: "乡土中国",
		author: ["费孝通"],
		publisher: "北京大学出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"差序格局、礼治秩序、无讼……十四篇短文讲透中国基层社会的底层逻辑。理解中国人际关系的必读书。",
		recommendationReason: "写于 1947 年，今天读处处对应现实。薄，且硬核。",
		tags: ["社会学", "人文", "经典"],
		featured: true,
	},
	{
		id: "17",
		title: "人类简史",
		author: ["尤瓦尔·赫拉利", "林俊宏 译"],
		publisher: "中信出版社",
		firstEdition: { year: 2014, edition: "第一版" },
		coverUrl: null,
		description:
			"从认知革命、农业革命到科学革命，一部关于人类如何走到今天的宏大叙事——以及我们对「讲故事」这件事的依赖。",
		recommendationReason: "观点未必都同意，但每次合上都忍不住跟人安利。",
		tags: ["历史", "科普", "人文"],
		featured: true,
	},
	{
		id: "18",
		title: "追风筝的人",
		author: ["卡勒德·胡赛尼", "李继宏 译"],
		publisher: "上海人民出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"阿富汗少爷阿米尔与仆人之子哈桑的友谊与背叛。为你，千千万万遍。",
		recommendationReason: "后半程几乎是一口气读完的。别在地铁上看结尾。",
		tags: ["小说", "外国文学"],
		featured: false,
	},
	{
		id: "19",
		title: "解忧杂货店",
		author: ["东野圭吾", "李盈春 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2014, edition: "第一版" },
		coverUrl: null,
		description:
			"一家可以穿越时空回信的杂货店，几个互相咬合的人生故事。东野圭吾难得的温柔之作。",
		recommendationReason: "结构精巧得像钟表。适合心情低落时读，治愈但不说教。",
		tags: ["小说", "外国文学", "治愈"],
		featured: false,
	},
	{
		id: "20",
		title: "霍乱时期的爱情",
		author: ["加西亚·马尔克斯", "杨玲 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"一段跨越半个多世纪的爱情，在战争与霍乱之间等待了五十三年七个月零十一天。",
		recommendationReason: "如果说《百年孤独》是宿命，这本就是耐心。爱情的所有形态都在里面了。",
		tags: ["文学", "小说", "外国文学"],
		featured: false,
	},
	{
		id: "21",
		title: "文学回忆录",
		author: ["木心 讲述", "陈丹青 笔录"],
		publisher: "广西师范大学出版社",
		firstEdition: { year: 2013, edition: "第一版" },
		coverUrl: null,
		description:
			"1989 至 1994 年，木心在纽约为陈丹青等一群画家讲授世界文学史，五年讲课的完整笔记。一部私人的文学宇宙。",
		recommendationReason: "像跟着一位毒舌又深情的老先生，把文学史重新走了一遍。",
		tags: ["文学", "随笔", "讲稿"],
		featured: true,
	},
	{
		id: "22",
		title: "棋王·树王·孩子王",
		author: ["阿城"],
		publisher: "人民文学出版社",
		firstEdition: { year: 2000, edition: "第一版" },
		coverUrl: null,
		description:
			"知青岁月里的三个故事：痴迷下棋的王一生、守着巨树的李三明、教学生认字的待业青年。汉语白描写作的范本。",
		recommendationReason: "白描功夫登峰造极。火车上吃的那碗饭，读一次饿一次。",
		tags: ["小说", "中国文学", "经典"],
		featured: false,
	},
];

/* ---------- 顶层运行时断言（fail fast）---------- */

function assertBooksValid(data: Book[]): void {
	const seen = new Set<string>();
	for (const b of data) {
		const where = `books[id=${b?.id ?? "?"}]`;
		if (!/^\d{2}$/.test(b.id)) throw new Error(`${where}: id 必须是两位数字字符串`);
		if (seen.has(b.id)) throw new Error(`${where}: id 重复`);
		seen.add(b.id);
		if (!Array.isArray(b.author) || b.author.length === 0 || b.author.some((a) => typeof a !== "string" || a.trim() === "")) {
			throw new Error(`${where}: author 必须为非空 string[]`);
		}
		for (const field of ["title", "publisher", "description", "recommendationReason"] as const) {
			if (typeof b[field] !== "string" || b[field].trim() === "") {
				throw new Error(`${where}: ${field} 必须为非空字符串`);
			}
		}
		if (!Number.isInteger(b.firstEdition?.year)) throw new Error(`${where}: firstEdition.year 必须为整数`);
		if (typeof b.firstEdition?.edition !== "string" || b.firstEdition.edition === "") {
			throw new Error(`${where}: firstEdition.edition 必须为非空字符串`);
		}
		if (b.coverUrl !== null && !(typeof b.coverUrl === "string" && b.coverUrl.startsWith("/"))) {
			throw new Error(`${where}: coverUrl 必须为 null 或以 / 开头的本地路径`);
		}
		if (!Array.isArray(b.tags) || b.tags.length === 0 || b.tags.some((t) => typeof t !== "string" || t.trim() === "")) {
			throw new Error(`${where}: tags 必须为非空 string[]`);
		}
		if (typeof b.featured !== "boolean") throw new Error(`${where}: featured 必须为 boolean`);
	}
}

assertBooksValid(BOOKS);

/** 站长推荐池规模下限：featured 换一组需「新组排除旧组全部 6 本」，
 *  池 >= 2×6 才能保证每次整组替换都可行（原型 13 本满足）。 */
const FEATURED_POOL_MIN = 12;
const featuredCount = BOOKS.filter((b) => b.featured).length;
if (featuredCount < FEATURED_POOL_MIN) {
	throw new Error(`books: featured 池仅 ${featuredCount} 本，少于整组换所需的 ${FEATURED_POOL_MIN} 本下限`);
}

/* ---------- 查询工具 ---------- */

/** 全量书籍（V1 fixture，只读约定：外部不得修改数组元素） */
export const books: readonly Book[] = BOOKS;

/** 站长推荐池（featured === true） */
export const featuredBooks: readonly Book[] = BOOKS.filter((b) => b.featured);

export function getBookById(id: string): Book | null {
	return BOOKS.find((b) => b.id === id) ?? null;
}

/** 同架图书：按共享标签数降序取前 n 本（排除自身，仅保留至少共享 1 个标签者） */
export function getSameShelf(book: Book, n = 4): Book[] {
	return BOOKS.filter((b) => b.id !== book.id)
		.map((b) => ({ b, overlap: b.tags.filter((t) => book.tags.includes(t)).length }))
		.filter((x) => x.overlap > 0)
		.sort((a, z) => z.overlap - a.overlap)
		.slice(0, n)
		.map((x) => x.b);
}

/** 全部标签按出现频次降序（同频次按首次出现顺序） */
export function allTags(): string[] {
	const counts = new Map<string, number>();
	for (const b of BOOKS) {
		for (const t of b.tags) {
			counts.set(t, (counts.get(t) ?? 0) + 1);
		}
	}
	return Array.from(counts.entries())
		.sort((a, z) => z[1] - a[1])
		.map(([tag]) => tag);
}
