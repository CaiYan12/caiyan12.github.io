/**
 * 友链数据（对应 Emlog emlog_link 表）
 */
export interface Friend {
	name: string;
	url: string;
	description: string;
	avatar?: string;
}

export const friends: Friend[] = [
	{
		name: "明月浩空",
		url: "http://limh.me",
		description: "Colorful 主题作者",
	},
	{
		name: "Emlog",
		url: "https://www.emlog.net",
		description: "轻量级博客程序",
	},
];
