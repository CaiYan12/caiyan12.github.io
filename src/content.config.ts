import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * posts：博客文章（对应 Emlog emlog_blog 表）
 * 使用 bundle 目录格式：src/content/posts/<slug>/index.md + 封面图
 */
const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		/** 置顶（对应 Emlog top 字段） */
		pinned: z.boolean().optional().default(false),
		/** 私密帖（对应 Emlog 私密日志：隐藏于各列表，但页面仍构建、可直接 URL 访问） */
		private: z.boolean().optional().default(false),
		/** 观看数（对应 Emlog views 字段，静态化后为历史值） */
		views: z.number().optional().default(0),
		/** 评论数（对应 Emlog comnum 字段，静态化后为历史值） */
		comments: z.number().optional().default(0),
		/** 热门指数（0-5 星，用于"热门推荐"模块） */
		hotness: z.number().min(0).max(5).optional().default(0),
		author: z.string().optional().default("WindowsIt"),
		lang: z.string().optional().default("zh_CN"),
		/** 阅读时间（由 remark-reading-time 注入） */
		readingTime: z.number().optional(),
		/** 摘要（由 remark-excerpt 注入） */
		excerpt: z.string().optional().default(""),
	}),
});

/**
 * spec：特殊页面（关于、友链等，对应 Emlog 独立页面 Page 表）
 */
const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional().default(""),
		updated: z.date().optional(),
	}),
});

export const collections = { posts: postsCollection, spec: specCollection };
