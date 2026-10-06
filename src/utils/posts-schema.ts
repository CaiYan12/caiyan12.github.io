import { z } from "astro/zod";

/**
 * posts collection 的 schema。
 *
 * 从 `src/content.config.ts` 抽出并具名导出的唯一目的：让 schema 规则进 `pnpm test:utils` 的扫描范围
 * （`src/utils/*.test.ts`），从而获得自动门禁。`src/content.config.ts` 依赖 `astro:content` 虚拟模块，
 * 在裸 node 下不可导入（`scripts/test-hooks.mjs` 的桩只导出 `getCollection`），因此测 schema 不能直接引用它；
 * 而 `astro/zod` 在裸 node 下可正常导入，所以本文件只依赖 `astro/zod`。
 */
export const postsSchema = z.object({
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
	/** 阅读时间（优先使用 frontmatter 手写值，缺省时由 remark-reading-time 注入） */
	readingTime: z.number().int().positive().optional(),
	/** 摘要（由 remark-excerpt 注入） */
	excerpt: z.string().optional().default(""),
	/**
	 * 文集 slug。有该属性即判定属于某个文集（判定层不查登记表；分组只看它的值）。
	 * `.min(1)` 是刻意的：`series: ""` 在内容层直接是 schema 错误，比构建期校验更早。
	 * 可选也是刻意的：未列入文集的文章零改动即可通过校验。
	 */
	series: z.string().min(1).optional(),
	/** 组内序号，从 0 起；与 `series` 成对使用（`series` 决定分组，`seriesOrder` 决定组内顺序） */
	seriesOrder: z.number().int().nonnegative().optional(),
});
