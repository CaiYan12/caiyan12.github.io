/**
 * 微言碎语数据（对应 Emlog emlog_twitter 表）
 * 每条：日期 + 内容 + 可选图片
 */
export interface DiaryItem {
	date: string; // YYYY-MM-DD HH:mm
	content: string;
	image?: string;
}

export const diary: DiaryItem[] = [
	{
		date: "2026-07-28 21:30",
		content:
			"站点迁移到 Astro 啦！从 Emlog Colorful 主题迁移成纯静态博客，更快更安全。",
	},
	{
		date: "2026-07-20 09:12",
		content:
			"今天给博客配好了 GitHub + Vercel 自动部署，以后写文章只要 git push 就行。",
	},
	{
		date: "2026-07-10 23:05",
		content: "深夜写代码，耳机里循环播放周杰伦的《安静》。",
	},
];
