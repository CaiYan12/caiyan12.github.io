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

import friendData from "./friends.json" with { type: "json" };

export const friends: Friend[] = friendData;
