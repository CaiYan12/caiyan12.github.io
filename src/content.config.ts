import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { postsSchema } from "./utils/posts-schema";

/**
 * posts：博客文章（对应 Emlog emlog_blog 表）
 * 使用 bundle 目录格式：src/content/posts/<yyyymmddhhmmss>/index.md + 封面图
 * schema 抽到 src/utils/posts-schema.ts（具名导出 postsSchema），以便进 pnpm test:utils
 */
const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
	schema: postsSchema,
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
