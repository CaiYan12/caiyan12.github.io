// 文集登记表：只承担「这个 slug 叫什么、量词是什么、简介与封面是什么」，
// 不放成员名单——成员资格与组内顺序都由文章 frontmatter 的 series / seriesOrder 声明。

export interface SeriesMeta {
	/** 文集 slug；文章 frontmatter 的 `series` 即指向它 */
	slug: string;
	/** 文集名（卡片徽章、页头与分享卡都用它） */
	name: string;
	/** 文集简介（总览页卡片与页面 description） */
	description: string;
	/** 文集封面（站内路径，以 / 开头）；缺省时按组内序号取首位带 image 的成员头图 */
	cover?: string;
	/** 量词（章 / 篇……），缺省 "篇" */
	unit?: string;
}

export const seriesList: SeriesMeta[] = [
	{
		slug: "webapp-vibe-coding",
		name: "看懂 AI 写的网站",
		unit: "章",
		description:
			"在 AI 把十几件互相关联的事压成十几条命令之后，教你怎么判断每条命令在动什么。按 L0 到 L12 逐层展开现代 Web 技术栈，训练判断力而不是动手能力。",
	},
	{
		slug: "matt-pocock",
		name: "Matt Pocock 技能选讲",
		unit: "篇",
		description:
			"围绕 Matt Pocock 那套 Claude Code 技能工作流的两篇实践记录：一篇讲把它用进实际的 Vibe Coding 里，一篇讲 v1.3.1 新增的 /implement-spec、/pr 与 /retro。",
	},
];
