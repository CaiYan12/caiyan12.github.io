/**
 * 友链数据（对应 Emlog emlog_link 表）
 */
export interface Friend {
	name: string;
	url: string;
	description: string;
	tags: string[];
	avatar?: string;
}

export const friends: Friend[] = [
	{
		name: "明月浩空",
		url: "https://myhkw.cn/",
		description: "免费 HTML5 音乐播放器与音乐 API 服务。",
		tags: ["Music", "Tool"],
	},
	{
		name: "Astro",
		url: "https://astro.build/",
		description: "面向内容驱动网站与 Web 应用的现代框架。",
		tags: ["Framework", "Web"],
	},
	{
		name: "ZCJUN.COM",
		url: "https://zcjun.com/",
		description: "分享副业教程、AI 工具资讯与实用网站。",
		tags: ["Blog", "AI"],
	},
	{
		name: "洛谷",
		url: "https://www.luogu.com.cn/",
		description: "面向程序设计学习者的算法刷题与竞赛社区。",
		tags: ["Algorithm", "OJ"],
	},
];
