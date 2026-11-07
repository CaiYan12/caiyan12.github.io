# 文集（series）实现前的存量代码锚点实测笔记

- 生成时间：2026-10-06（Asia/Shanghai）
- 仓库根：`D:\pages\myblog`（只读实测，本笔记写在仓库外）
- 依据文档：`docs/plans/2026-10-06-collection-series-spec.md`（权威）、`docs/plans/2026-10-06-collection-series-tickets.md`、`docs/adr/0007-series-closed-reading-sequence.md`、`AGENTS.md`、`.workbuddy-ai/memory/MEMORY.md`
- 本笔记所有文件路径均为**仓库相对路径**（除注明外）；所有行号都是**本次实测的真实行号**，不是 spec 里的「约」行号
- 代码片段逐字保真（含 tab/空格、标识符大小写）。仓库 Prettier 配置 `tabWidth 4 / useTabs true`，故片段中的缩进是真 tab，`global.css` 中组件层的两空格缩进也是原文
- **未修改仓库内任何文件**

---

## 速查表

| # | 文件 | 关键锚点 | 真实行号 |
| --- | --- | --- | --- |
| 1 | `src/content.config.ts` | `postsCollection` 定义起点 | 9 |
| 1 | `src/content.config.ts` | `postsCollection.schema: z.object({...})` 内联起点 | 11 |
| 1 | `src/content.config.ts` | `specCollection` 定义起点 | 42 |
| 1 | `src/content.config.ts` | `export const collections` | 51 |
| 2 | `src/utils/content-utils.ts` | `isPublicPost` | 8–10 |
| 2 | `src/utils/content-utils.ts` | `getSortedPosts`（过滤 + pinned 优先 + published 倒序） | 13–23 |
| 2 | `src/utils/content-utils.ts` | `getNeighbors`（**现有实现，本方案保留不改**） | 110–122 |
| 2 | `src/utils/content-utils.ts` | `getCover` | 151–157 |
| 3 | `src/utils/content-utils.test.ts` | `fakePost` 工厂 | 18–41 |
| 3 | `src/utils/content-utils.test.ts` | `getNeighbors` 用例（spec 引的 `:132`） | 132–154 |
| 3 | `src/utils/content-utils.test.ts` | `getCover` 用例 | 156–167 |
| 4 | `scripts/test-hooks.mjs` | `astro:content` 桩（全文仅 31 行） | 7–8 |
| 5 | `src/pages/posts/[...slug].astro` | `getStaticPaths`（**只过滤 `draft`，不过滤 `private`**） | 22–30 |
| 5 | `src/pages/posts/[...slug].astro` | `getNeighbors(allPosts, post.id)` 调用行 | 48 |
| 5 | `src/pages/posts/[...slug].astro` | `getCover(post)` → `const cover` | 51 |
| 5 | `src/pages/posts/[...slug].astro` | `<MainGridLayout ... searchIndex={!post.data.private}>` | 86–92 |
| 5 | `src/pages/posts/[...slug].astro` | `.page` 容器 / `.post-cover` figure | 99 / 110–124 |
| 5 | `src/pages/posts/[...slug].astro` | `.post-header`（h1） | 127–129 |
| 5 | `src/pages/posts/[...slug].astro` | `.post-metaa`（面包屑 + tools） | 131–187 |
| 5 | `src/pages/posts/[...slug].astro` | `.post-context`（正文） | 189–297 |
| 5 | `src/pages/posts/[...slug].astro` | `.cutline` | 257–259 |
| 5 | `src/pages/posts/[...slug].astro` | `.post-navigation`（prev/next 按钮） | 261–296 |
| 6 | `src/components/layout/ListingHeader.astro` | Props 类型 `icon`/`title`/`crumbs` | 8–18 |
| 6 | 真实调用点 `src/pages/tag/index.astro` | `<ListingHeader icon="fa-tags" .../>` | 16–20 |
| 6 | 真实调用点 `src/pages/hot/index.astro` | `<ListingHeader icon="fa-fire" .../>` | 25–29 |
| 7 | `src/components/layout/PostCard.astro` | Props 类型 | 8–11 |
| 7 | `src/components/layout/PostCard.astro` | `h2` 内 label 序列（`置顶`/`近期更新`/`热门`） | 25–53 |
| 7 | `src/components/layout/PostCard.astro` | `.post-thumbnail` / `.post-excerpt` / `.goon` | 98–107 |
| 8 | `src/components/layout/Pagination.astro` | Props 类型 | 2–11 |
| 8 | 真实调用点 `src/pages/hot/index.astro` | `<Pagination .../>` | 39–44 |
| 8 | 真实调用点 `src/components/layout/TaxonomyListing.astro` | `<Pagination .../>`（`/tag/`、`/category/` 共用） | 81–86 |
| 9 | `src/components/widget/WidgetLayout.astro` | 全文（`title` + 可选 `icon` + `actions` 插槽） | 1–23 |
| 10 | `src/components/widget/WidgetRelatedPosts.astro` | 从 URL 取 slug | 8 |
| 10 | `src/components/widget/WidgetRelatedPosts.astro` | 全文 | 1–61 |
| 11 | `src/components/layout/SideBar.astro` | `widgetMap` 定义 | 18–32 |
| 11 | `src/components/layout/SideBar.astro` | `sidebarConfig.widgets` 映射 + `<Comp />` | 33–40 |
| 12 | `src/config.ts` | `siteConfig.postsPerPage: 10` | 30 |
| 12 | `src/config.ts` | `navBarConfig.archiveSite` | 57–62 |
| 12 | `src/config.ts` | `sidebarConfig.widgets` | 96–112 |
| 13 | `src/pages/tag/[tag].astro` | 全文（第 1 页，手写切片） | 1–52 |
| 13 | `src/pages/tag/[tag]/page/[page].astro` | 全文（`paginate`） | 1–65 |
| 13 | `src/pages/tag/index.astro` | 全文（索引页，`ListingHeader` 真实调用点） | 1–32 |
| 13 | `src/pages/category/[category].astro` | 全文 | 1–50 |
| 13 | `src/utils/pagination.ts` | `getPaginationUrl` / `getPageMeta` | 5–30 |
| 14 | `src/layouts/MainGridLayout.astro` | Props（`image` / `searchIndex`） | 10–23 |
| 14 | `src/layouts/MainGridLayout.astro` | `searchIndex = false` 缺省 | 25 |
| 14 | `src/layouts/MainGridLayout.astro` | `<main id="main">` | 43 |
| 14 | `src/layouts/MainGridLayout.astro` | `<div id="content" data-pagefind-body>` | 56–61 |
| 14 | `src/layouts/MainGridLayout.astro` | `{showSidebar && <SideBar />}` | 62 |
| 15 | `src/layouts/Layout.astro` | `og:image` / 头像降级 `ogImageUrl` | 43–44 |
| 15 | `src/layouts/Layout.astro` | `<meta property="og:image">` | 89 |
| 16 | `src/styles/global.css` | `:root` token 定义（`@layer base` 内，**元素级 tab 缩进**） | 11–36 |
| 16 | `src/styles/global.css` | `.page .post-cover` | 438–444 |
| 16 | `src/styles/global.css` | `.post-context`（组件层，**已被 3110 覆盖**） | 452–455 |
| 16 | `src/styles/global.css` | `.post-metaa`（组件层，**已被 2931 覆盖**） | 462–470 |
| 16 | `src/styles/global.css` | `.post-metaa a` / `:hover`（组件层） | 471–476 |
| 16 | `src/styles/global.css` | `.widget`（组件层） | 663–669 |
| 16 | `src/styles/global.css` | `.widget`（**生效版**） | 3388–3394 |
| 16 | `src/styles/global.css` | `.blogtags` 六色变量 | 3771–3781 |
| 16 | `src/styles/global.css` | `.blogtags a` | 3783–3793 |
| 16 | `src/styles/global.css` | `.blogtags a.is-current` | 3869–3875 |
| 16 | `src/styles/global.css` | `.post-list:nth-child(N)::after` 色带枚举（2…12 位） | 2503–2538 |
| 16 | `src/styles/global.css` | `.post-list`（生效版） / `::after` / `:hover::after` | 2476–2485 / 2491–2501 / 2539–2541 |
| 16 | `src/styles/global.css` | `.post-thumbnail`（生效版，**160×120**） | 2654–2676 |
| 16 | `src/styles/global.css` | `.post-excerpt`（生效版） / `.goon` / `.goon a` | 2678–2685 / 2687–2690 / 2692–2708 |
| 16 | `src/styles/global.css` | `.post-header`（生效版，h2 单行截断） | 2543–2564 |
| 16 | `src/styles/global.css` | `.cutline`（生效版） / `.cutline span` | 3237–3244 / 3246–3256 |
| 16 | `src/styles/global.css` | `.post-navigation a`（**固定左右两侧 100×100 浮动箭头**） | 3258–3278 |
| 16 | `src/styles/global.css` | `.post-navigation h3` / `.post-navigation-title` | 3335 / 3357 |
| 17 | `src/utils/lqip-utils.ts` | `getLqipProps` / `getLqipGradient` / `isExternalImage` | 56–65 / 22–44 / 47–53 |
| 17 | `src/components/control/ResponsiveImage.astro` | Props（`src` + `sizes`） / 全组件 | 6–17 / 1–34 |
| 18 | `scripts/generate-lqips.mjs` | 扫描根、`IGNORE_DIRS` | 21–33 |
| 18 | `scripts/generate-lqips.mjs` | 输出 `src/constants/lqips.json` / `src/constants/image-manifest.json` | 23 / 38 |
| 18 | `src/constants/lqips.json` | 顶层键形态（示例） | 914 行 |
| 18 | `src/constants/image-manifest.json` | 顶层键形态（示例） | 457 行 |
| 19 | `scripts/lib/smoke-harness.mjs` | `makeHarness` 签名 / `check` / `checkClean` / `finish` / 返回对象 | 29–34 / 68 / 107–124 / 135–140 / 142–154 |
| 19 | `scripts/fancybox-smoke.mjs` | 真实调用点（头 60 行 + 尾 20 行） | 1–70 / 435–455 |
| 20 | `src/data/` | 目录清单 | 12 个文件 |
| 20 | `src/data/timeline.ts` | TS 模块体例样板（头 40 行） | 1–40 |
| 21 | `src/content/posts/*/index.md` | 六篇成员 + 一篇非成员 frontmatter | 见 §21 |
| 22 | `public/images/posts/20261002071103/…ch0-cover.jpg` | 存在，65221 B | — |
| 22 | `public/images/posts/20260919135000/…workflow-cover.jpg` | 存在，64460 B | — |
| 23 | `public/images/` 一级子目录 | 清单 | 见 §23 |

---

## 1. `src/content.config.ts`（全文，仅 51 行）

imports（第 1–3 行）：

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
```

`postsCollection`（第 5–37 行）——**`schema` 是内联 zod，不是引用**：

```ts
/**
 * posts：博客文章（对应 Emlog emlog_blog 表）
 * 使用 bundle 目录格式：src/content/posts/<yyyymmddhhmmss>/index.md + 封面图
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
		/** 阅读时间（优先使用 frontmatter 手写值，缺省时由 remark-reading-time 注入） */
		readingTime: z.number().int().positive().optional(),
		/** 摘要（由 remark-excerpt 注入） */
		excerpt: z.string().optional().default(""),
	}),
});
```

`specCollection`（第 39–49 行）：

```ts
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
```

导出（第 51 行）：

```ts
export const collections = { posts: postsCollection, spec: specCollection };
```

**要点**：把 `postsCollection.schema` 抽到 `src/utils/posts-schema.ts` 后，`content.config.ts` 只剩「改 `schema: postsSchema` + 加一行 import」；`specCollection` 不动。当前文件**没有**任何 import 来自 `src/utils/`。

---

## 2. `src/utils/content-utils.ts`（158 行）

impoorts（第 1–3 行）：

```ts
import type { CollectionEntry } from "astro:content";
import dayjs from "dayjs";
import { getEffectiveComments } from "./site-stats";
```

类型导出（第 5 行）：

```ts
export type Post = CollectionEntry<"posts">;
```

### 函数清单（按源顺序，真实行号）

| 函数 | 签名 | 行号 |
| --- | --- | --- |
| `isPublicPost` | `(post: Post): boolean` | 8–10 |
| `getSortedPosts` | `(posts: Post[]): Post[]` | 13–23 |
| `getTagList` | `(posts: Post[]): { name: string; count: number }[]` | 29–49 |
| `getCategoryList` | `(posts: Post[]): { name: string; count: number }[]` | 52–75 |
| `getArchiveList` | `(posts: Post[])` | 78–86 |
| `getHotPosts` | `(posts: Post[], limit = 6): Post[]` | 89–102 |
| `getNewPosts` | `(posts: Post[], limit = 8): Post[]` | 105–107 |
| `getNeighbors` | `(posts: Post[], slug: string): { prev: Post \| null; next: Post \| null }` | 110–122 |
| `isNewPost` | `(post: Post): boolean` | 125–130 |
| `getExcerpt` | `(post: Post, length = 120): string` | 133–148 |
| `getCover` | `(post: Post): string` | 151–157 |

### `isPublicPost`（第 7–10 行）

```ts
/** 是否为公开文章：排除草稿与私密帖 */
export function isPublicPost(post: Post): boolean {
	return !post.data.draft && !post.data.private;
}
```

### `getSortedPosts` 的排序实现（第 12–23 行）

```ts
/** 按置顶 + 发布时间倒序排序（对应 Emlog 首页排序） */
export function getSortedPosts(posts: Post[]): Post[] {
	return [...posts].filter(isPublicPost).sort((a, b) => {
		if (a.data.pinned !== b.data.pinned) {
			return a.data.pinned ? -1 : 1;
		}
		return (
			dayjs(b.data.published).valueOf() -
			dayjs(a.data.published).valueOf()
		);
	});
}
```

**关键**：`getSortedPosts` 内部**已经**用 `isPublicPost` 过滤——`private: true` 的文章不会出现在结果里（见 §与 spec 的出入 第 1 条）。

### `getNeighbors` 的完整实现（第 109–122 行）

```ts
/** 获取相邻文章（对应 Emlog neighborLog） */
export function getNeighbors(
	posts: Post[],
	slug: string,
): { prev: Post | null; next: Post | null } {
	const sorted = getSortedPosts(posts);
	const idx = sorted.findIndex((p) => p.id === slug);
	if (idx === -1) return { prev: null, next: null };
	return {
		// 时间更早的为上一篇
		prev: idx + 1 < sorted.length ? sorted[idx + 1] : null,
		next: idx - 1 >= 0 ? sorted[idx - 1] : null,
	};
}
```

**注意语义**：`sorted` 是倒序（最新在前）。`prev` 取 `idx+1`（更早），`next` 取 `idx-1`（更新）。未知 slug → `{ prev: null, next: null }`。

### `getCover` 的完整实现（第 150–157 行）

```ts
/** 获取文章封面图（优先 frontmatter image，兜底随机缩略图，对应 getThumbnail） */
export function getCover(post: Post): string {
	if (post.data.image) return post.data.image;
	// 用 slug 的 hash 稳定地选一张随机缩略图（避免每次构建随机）
	const idx =
		([...post.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 40) + 1;
	return `/images/random/tb${idx}.jpg`;
}
```

**实测**：`public/images/random/` 下确为 **40 张**（`tb1.jpg`…`tb40.jpg`）。spec 说的「40 张」准确。

---

## 3. `src/utils/content-utils.test.ts`（185 行）

### 头部与 import（第 1–14 行）

```ts
// content-utils 纯函数单测：排序/评分/聚合是所有列表页的数据地基（node --test 经 test-hooks 注入解析钩子）。
// 用例中的 Post 以最小形状伪造，经 as unknown as Post 断言注入——仅依赖被测函数实际读取的字段。
import test from "node:test";
import assert from "node:assert/strict";
import {
	getSortedPosts,
	getHotPosts,
	getTagList,
	getCategoryList,
	getNeighbors,
	getCover,
	getExcerpt,
	type Post,
} from "./content-utils";
```

- 用 `node:test`（不是 vitest），无描述性 `describe`，直接 `test("...", () => {...})`
- import 路径**无扩展名**（`"./content-utils"`），由 `scripts/test-hooks.mjs` 补 `.ts`
- `type Post` 从被测模块本身导入

### 造假 post 的 helper（第 16–41 行，**有 factory**）

```ts
const d = (s: string) => new Date(s);

function fakePost(overrides: Record<string, unknown> = {}): Post {
	const { id = "20260101000000", body = "", ...data } = overrides;
	return {
		id,
		slug: id,
		body,
		collection: "posts",
		render: () => {
			throw new Error("not implemented in test");
		},
		data: {
			title: `post-${id}`,
			published: d("2026-01-01"),
			pinned: false,
			draft: false,
			private: false,
			tags: [],
			category: "",
			hotness: 0,
			comments: 0,
			...data,
		},
	} as unknown as Post;
}
```

**可直接照抄的用法**：`fakePost({ id: "a", published: d("2026-01-01") })`；`data` 层的字段直接平铺进 `overrides`（除 `id` 与 `body` 外）。注意 `series` / `seriesOrder` 会经 `...data` 直接进 `data`，**无需改 factory** 即可伪造。

### 现有用例组织（6 个顶层 `test`）

| 用例名 | 行号 |
| --- | --- |
| `"getSortedPosts：置顶优先，同级按发布时间倒序，过滤草稿与私密帖"` | 43–68 |
| `"getHotPosts：hotness×100+有效评论数评分，同分按发布时间倒序"` | 70–116 |
| `"getTagList/getCategoryList：按文章数倒序，忽略草稿与私密帖，空分类跳过"` | 118–130 |
| `"getNeighbors：prev 为更早一篇、next 为更新一篇；首末篇与未知 slug 边界"` | 132–154 |
| `"getCover：frontmatter image 优先；无图时 slug hash 稳定映射到 1..40 缩略图"` | 156–167 |
| `"getExcerpt：frontmatter excerpt 优先；否则剥离 Markdown 粗读正文并截断"` | 169–184 |

### `getNeighbors` 用例原文（第 132–154 行，spec 引的「约 :132」）

```ts
test("getNeighbors：prev 为更早一篇、next 为更新一篇；首末篇与未知 slug 边界", () => {
	const posts = [
		fakePost({ id: "a", published: d("2026-01-01") }),
		fakePost({ id: "b", published: d("2026-01-02") }),
		fakePost({ id: "c", published: d("2026-01-03") }),
	];
	// b 的上一篇是更早的 a，下一篇是更新的 c
	assert.deepEqual(getNeighbors(posts, "b").prev?.id, "a");
	assert.deepEqual(getNeighbors(posts, "b").next?.id, "c");
	// 最新一篇没有"下一篇"
	const c = getNeighbors(posts, "c");
	assert.equal(c.prev?.id, "b");
	assert.equal(c.next, null);
	// 最早一篇没有"上一篇"
	const a = getNeighbors(posts, "a");
	assert.equal(a.prev, null);
	assert.equal(a.next?.id, "b");
	// 单篇与未知 slug
	const single = getNeighbors([posts[0]!], "a");
	assert.equal(single.prev, null);
	assert.equal(single.next, null);
	assert.deepEqual(getNeighbors(posts, "nope"), { prev: null, next: null });
});
```

### 可直接照抄的最小用例骨架（新增 `getSeriesNeighbors` 用）

```ts
test("getSeriesNeighbors：……", () => {
	const posts = [
		fakePost({ id: "s0", published: d("2026-01-01"), series: "demo", seriesOrder: 0 }),
		fakePost({ id: "s1", published: d("2026-01-02"), series: "demo", seriesOrder: 1 }),
		fakePost({ id: "free", published: d("2026-01-03") }),
	];
	assert.equal(getSeriesNeighbors(posts, "s1").prev?.id, "s0");
	assert.equal(getSeriesNeighbors(posts, "s1").next, null);
	// series 只写不登记（无 seriesList 记录）也照样互为相邻
	assert.equal(getSeriesNeighbors(posts, "s0").series?.total, 2);
});
```

注意：若新增的 `getSeriesNeighbors` 用到 `seriesList`（`resolveSeriesMeta`），则需在测试里 import `src/data/series.ts`——但**归属分组本身不查登记表**，所以纯判定的用例不需要它。

---

## 4. `scripts/test-hooks.mjs`（全文，31 行）

```js
// node --test 的解析钩子：让 src/utils 下的 TS 纯函数可在裸 node 测试中导入。
// - astro:content 是 Astro 虚拟模块：被测代码只用其类型（运行时擦除），此处桩化保证可解析
// - 无扩展名相对导入补 .ts（Astro/TS 惯例；node ESM 要求显式扩展名）
// 由 package.json 的 test:utils 经 --import 注入，对 node --test 的子进程同样生效。
import { registerHooks } from "node:module";

const ASTRO_CONTENT_STUB =
	"data:text/javascript,export const getCollection = async () => [];";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "astro:content") {
			return { url: ASTRO_CONTENT_STUB, shortCircuit: true };
		}
		if (
			(specifier.startsWith("./") || specifier.startsWith("../")) &&
			context.parentURL?.startsWith("file:")
		) {
			try {
				return nextResolve(
					new URL(`${specifier}.ts`, context.parentURL).href,
					context,
				);
			} catch {
				// 非 .ts 相对导入交回默认解析
			}
		}
		return nextResolve(specifier, context);
	},
});
```

**`astro:content` 桩导出了什么**（第 7–8 行）：**只有 `getCollection`**，返回 `[]`。

```js
export const getCollection = async () => [];
```

**对本方案的影响**：
- `src/utils/posts-schema.ts` 若只 import `astro/zod`（不碰 `astro:content`），**本文件无需改**。✅ 与 spec 一致。
- 但注意桩**没有导出 `render`**——若新写的 `src/utils/*.ts` 出现 `import { render } from "astro:content"`，裸 node 下会 `SyntaxError`/`does not provide an export named 'render'`。本方案不需要。
- 桩也没有 `getEntry` / `getEntries`。新增的纯函数不要碰它们。

---

## 5. `src/pages/posts/[...slug].astro`（全文 444 行）

### 头部 import（第 1–20 行）

```astro
---
import MainGridLayout from "../../layouts/MainGridLayout.astro";
import Giscus from "../../components/comment/Giscus.astro";
import dayjs from "dayjs";
import { getCollection, render } from "astro:content";
import {
	getCategoryList,
	getCover,
	getHotPosts,
	getNeighbors,
	getTagList,
	isPublicPost,
} from "../../utils/content-utils";
import { siteConfig } from "../../config";
import { getEffectiveComments } from "../../utils/site-stats";
import QRCode from "qrcode";
import PostToc from "../../components/control/PostToc.astro";
import License from "../../components/misc/License.astro";
import { getLqipProps } from "../../utils/lqip-utils";
import ResponsiveImage from "../../components/control/ResponsiveImage.astro";
```

### `getStaticPaths`（第 22–30 行）—— 过滤条件

```astro
export async function getStaticPaths() {
	const posts = await getCollection("posts");
	return posts
		.filter((p) => !p.data.draft)
		.map((post) => ({
			params: { slug: post.id },
			props: { post },
		}));
}
```

**只过滤 `draft`，不过滤 `private`**——私密帖仍有页面（ADR 0007 第 19 行也这么写）。这与 §13 的 tag/category 路由（枚举 `getTagList(publicPosts)`）不同。

### 页面变量（第 32–56 行，含 `getNeighbors` 调用行）

```astro
const { post } = Astro.props;
const { title, published, updated, category, tags, author, readingTime } =
	post.data;
const comments = getEffectiveComments(post);
const { Content, headings } = await render(post);
const allPosts = await getCollection("posts");
// 只对**真的生成出来的路由**发链接（#41）：/tag/<x>/ 与 /category/<x>/ 的 getStaticPaths
// 枚举的是 getTagList(publicPosts)／getCategoryList(publicPosts)，而这两个函数都先过
// isPublicPost——私有文章独占的那一项从不生成页面，链过去就是 404。
// 判据与路由生成端同源，因此逐项退化而不是整行抹掉：私有文章若用的是公开分类（例如
// 「技术」）链接照常保留，只有无路由的那几项降成纯文字。
const publicPosts = allPosts.filter(isPublicPost);
const routedTags = new Set(getTagList(publicPosts).map(({ name }) => name));
const routedCategories = new Set(
	getCategoryList(publicPosts).map(({ name }) => name),
);
const { prev, next } = getNeighbors(allPosts, post.id);
const hotPosts = getHotPosts(allPosts, 6).filter((p) => p.id !== post.id);
const postUrl = new URL(`/posts/${post.id}/`, siteConfig.siteURL);
const cover = getCover(post);
// 构建期本地生成二维码（替代 api.qrserver.com 外链，避免国内可达性问题）
const qrDataUrl = await QRCode.toDataURL(postUrl.toString(), {
	width: 240,
	margin: 1,
});
```

**`getNeighbors` 调用行 = 第 48 行**（spec 说的「约 :48」准确）：
```
const { prev, next } = getNeighbors(allPosts, post.id);
```

**`getCover(post)` = 第 51 行**，赋给 `const cover`。封面回退（`resolveSeriesCover`）若插在这里，位置是 48 之后。

### `MainGridLayout` 与 `Layout` 的用法与传参（第 86–98 行）

```astro
<MainGridLayout
	title={title}
	description={post.data.description || post.data.excerpt}
	image={`/og/${post.id}.png`}
	ogType="article"
	searchIndex={!post.data.private}
>
```

- **传了**：`title` / `description` / `image`（OG 图，走 satori 端点 `/og/<id>.png`）/ `ogType="article"` / `searchIndex`
- **没传**：`prevUrl` / `nextUrl` / `canonicalUrl` —— 所以文章页**不输出** `<link rel="prev">` / `<link rel="next">`（spec 第 55 行的事实准确）
- 第 93–98 行有一个 `slot="head"` 的 JSON-LD `<script is:inline>`

### `.page` 容器与 `.post-cover`（第 99–124 行）

```astro
	<div class="page">
		<div
			class="post-reading-progress"
			data-reading-progress
			role="progressbar"
			aria-label="文章阅读进度"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow="0"
		>
		</div>
		<figure class="post-cover lqip-wrap">
			<div
				class="lqip-placeholder"
				style={getLqipProps(cover).style}
				aria-hidden="true"
			>
			</div>
			<ResponsiveImage
				src={cover}
				alt={title}
				title={title}
				loading="eager"
				sizes="(max-width: 680px) 100vw, (max-width: 1000px) calc(100vw - 40px), 660px"
			/>
		</figure>
```

**`<div class="page">` = 第 99 行**；`.page .post-cover` 选择器命中此处（目录页要复用同一容器类名 `.page`）。`figure.post-cover` = 第 110–124 行，`ResponsiveImage` 用 `loading="eager"` + `sizes`。

### `.post-header`（第 126–129 行）

```astro
		<article role="article">
			<header class="post-header">
				<h1 title={title}>{title}</h1>
			</header>
```

### `.post-metaa`（第 131–187 行）—— 面包屑 + 工具条

```astro
			<address class="post-metaa">
				<i class="fa fa-home" aria-hidden="true"></i>
				<a href="/" title="返回首页">首页</a>
				&raquo;
				<i class="fa fa-folder-open-o" aria-hidden="true"></i>
				{
					category ? (
						routedCategories.has(category) ? (
							<a
								href={`/category/${encodeURIComponent(category)}/`}
								title={`查看${category}下的全部文章`}
							>
								{category}
							</a>
						) : (
							<span>{category}</span>
						)
					) : (
						"未分类"
					)
				}
				&raquo;
				<i class="fa fa-clock-o" aria-hidden="true"></i>
				{dayjs(published).format("YYYY年M月D日")}
				<span class="ml-2">
					<i class="fa fa-comments ml-2" aria-hidden="true"></i>
					{comments} 吐槽
				</span>
				{
					typeof readingTime === "number" && (
						<span class="ml-2">
							<i class="fa fa-search ml-2" aria-hidden="true" />
							{readingTime} 分钟读完
						</span>
					)
				}

				<ul class="tools">
					<li title="字号" class="size" id="font-size-btn">
						A
						<div class="font-size-pop" id="font-size-pop">
							<input
								type="range"
								id="font-size-range"
								min="12"
								max="24"
								step="1"
								value="14"
								aria-label="正文字号"
							/>
							<output id="font-size-value" for="font-size-range"
								>14px</output
							>
						</div>
					</li>
				</ul>
			</address>
```

**顶部「归属一行」的插入位置**：spec 说「标题与文章元信息之下、正文之前」。按现有 DOM，`.post-metaa` 结束于**第 187 行**，`.post-context` 开始于**第 189 行**——插入点就是 **188 行附近**（`</address>` 与 `<div class="post-context prose">` 之间）。注意 spec 第 144 行说「新类不带上边框」的理由是「`.post-metaa` 已在上方画过一条 `1px dotted` 分隔线」——`.post-metaa` 的 `border-bottom` 生效值是 `1px dotted var(--colorful-line)`（见 §16）。

### `.post-context`（第 189–297 行）

```astro
			<div class="post-context prose">
				<PostToc headings={headings} />
				<Content />
```

（其后为 `post-last-updated` / `post-lisence` 二维码块 / `.cutline` / `.post-navigation`。）

### `.cutline`（第 257–259 行）

```astro
				<div class="cutline">
					<span>正文到此结束</span>
				</div>
```

### `.post-navigation`（第 261–296 行）—— prev/next 按钮标记与 `rel`

```astro
				<div class="post-navigation">
					{
						prev && (
							<a
								rel="prev"
								href={`/posts/${prev.id}/`}
								class="prev"
								title={prev.data.title}
							>
								<span class="icon-wrap" />
								<h3>
									<span class="post-navigation-title">
										{prev.data.title}
									</span>
								</h3>
							</a>
						)
					}
					{
						next && (
							<a
								rel="next"
								href={`/posts/${next.id}/`}
								class="next"
								title={next.data.title}
							>
								<span class="icon-wrap" />
								<h3>
									<span class="post-navigation-title">
										{next.data.title}
									</span>
								</h3>
							</a>
						)
					}
				</div>
```

**要点**：
- `rel="prev"` / `rel="next"` **已在可见 `<a>` 上**（第 265 / 282 行），`class="prev"` / `class="next"`
- `prev` / `next` 为 `null` 时该方向整块不渲染——**「边界不渲染」天然满足**，无需额外条件
- **末尾「归属一行」的插入位置**：spec 说「`.cutline` 之下、`.post-navigation` 之上」→ 现有 DOM 即 **260 行**（`</div>` @259 与 `<div class="post-navigation">` @261 之间）

### 其余段落（供参考，不属本方案改动）

- 第 300–344 行：`.post-related` 热门推荐块（用 `getCover(p)` 生成缩略图）
- 第 347 行：`<Giscus />`
- 第 350–443 行：字号调节内联 `<script>`（**必须位于 swup 容器 `main` 内**，见注释第 351–353 行）

---

## 6. `src/components/layout/ListingHeader.astro`（全文 55 行）

```astro
---
/**
 * 列表页头：post-header（图标 + 标题）与 post-metaa 面包屑。
 * 面包屑首项固定为"首页"，crumbs 依次给出中间层级与当前页（末项不带 href）。
 * 样式沿用 global.css 的 .post-header/.post-metaa 规则，此处零样式。
 * 注意空白结构：图标与标题之间保留一个空格，链接内不留首尾空白（与原页面逐字对齐）。
 */
interface Crumb {
	label: string;
	href?: string;
	icon?: string;
}

interface Props {
	icon: string;
	title: string;
	crumbs?: Crumb[];
}

const { icon, title, crumbs = [] } = Astro.props;
---

<header class="post-header">
	<h1>
		<i class={`fa ${icon}`} aria-hidden="true"></i>
		{title}
	</h1>
</header>
<address class="post-metaa">
	<i class="fa fa-home" aria-hidden="true"></i>
	<a href="/" title="返回首页">首页</a>
	{
		crumbs.map((crumb) => (
			<>
				&raquo;
				{crumb.href ? (
					// prettier-ignore：链接内不得引入首尾空白（与原页面逐字对齐）
					<a href={crumb.href} title={crumb.label}>
						{crumb.label}
					</a>
				) : (
					<>
						{crumb.icon && (
							<i class={`fa ${crumb.icon}`} aria-hidden="true" />
						)}
						{/* 相邻表达式之间的空白会被 Astro compressHTML 剥除，图标与
						    文字间的空格必须显式输出（元素与表达式之间则不受影响） */}{" "}
						{crumb.label}
					</>
				)}
			</>
		))
	}
</address>
```

**真实调用点** —— `src/pages/tag/index.astro` 第 16–20 行（`/tag/` 索引页）：

```astro
		<ListingHeader
			icon="fa-tags"
			title="标签云集"
			crumbs={[{ label: "标签云集", icon: "fa-tags" }]}
		/>
```

**另一个真实调用点** —— `src/pages/hot/index.astro` 第 25–29 行：

```astro
		<ListingHeader
			icon="fa-fire"
			title="热门推荐"
			crumbs={[{ label: "热门推荐", icon: "fa-fire" }]}
		/>
```

**传参说明**：
- `icon` 必填（字符串，只写 `fa-xxx` 部分，组件自己前缀 `fa `）
- `title` 必填
- `crumbs` 是**中间层级与当前页**的数组（组件自动在最前面加「首页」）；末项不带 `href` 时才会渲染 `icon`；末项若带 `icon`，写法是 `{ label, icon }`
- 若目录页要面包屑为「首页 » 文章文集 » 看懂 AI 写的网站」，则 `crumbs = [{ label: "文章文集", href: "/series/" }, { label: series.name, icon: "..." }]`（末项不带 href 即为当前页）

---

## 7. `src/components/layout/PostCard.astro`（全文 109 行）

### 头部与 Props（第 1–21 行）

```astro
---
import type { CollectionEntry } from "astro:content";
import dayjs from "dayjs";
import { getCover, getExcerpt, isNewPost } from "../../utils/content-utils";
import { siteConfig } from "../../config";
import { getEffectiveComments } from "../../utils/site-stats";

interface Props {
	post: CollectionEntry<"posts">;
	index?: number;
}

const { post } = Astro.props;
const { title, published, category, author } = post.data;
const effectiveComments = getEffectiveComments(post);
const url = `/posts/${post.id}/`;
const cover = getCover(post);
const excerpt = getExcerpt(post, siteConfig.excerptLength);
const showNew = isNewPost(post);
const showHot = post.data.hotness >= 4;
---
```

（`index?: number` 是 Props 里声明但**未解构使用**的字段。）

### `h2` 内既有 label 序列（第 23–53 行）

```astro
<article class="post-list" role="article">
	<header class="post-header">
		<h2>
			{
				post.data.pinned && (
					<>
						<span class="good-label">置顶</span>
						<i class="good-arrow" />
					</>
				)
			}
			{
				showNew && (
					<>
						<span class="new-label">近期更新</span>
						<i class="new-arrow" />
					</>
				)
			}
			{
				!post.data.pinned && showHot && effectiveComments >= 50 && (
					<>
						<span class="hot-label">热门</span>
						<i class="hot-arrow" />
					</>
				)
			}
			<a rel="bookmark" title={title} href={url}>
				{title}
			</a>
		</h2>
	</header>
```

**真实行号定位**：
- `<article class="post-list">` = 第 23 行
- `<header class="post-header">` = 第 24 行
- `<h2>` = 第 25 行
- `置顶` label（`<span class="good-label">`）= 第 29 行
- `近期更新` label（`<span class="new-label">`）= 第 37 行
- `热门` label（`<span class="hot-label">`）= 第 45 行
- 标题 link `<a rel="bookmark" …>` = 第 50–52 行
- `</h2>` = 第 53 行

**徽章插入点**：spec 说「在既有 label 序列之后、标题 link 之前」→ 现有 DOM 即 **第 49 行**（`热门` label 块 `}` @49 与 `<a rel="bookmark"` @50 之间）。

### `.post-meta` / `.post-content`（`.post-thumbnail` / `.post-excerpt` / `.goon`）（第 56–108 行）

```astro
	<div class="post-meta">
		<span class="pauthor">
			<i class="fa fa-user" aria-hidden="true"></i>
			{author}
		</span>
		<span class="ptime">
			<i class="fa fa-calendar" aria-hidden="true"></i>
			{dayjs(published).format("YYYY年MM月DD日")}
		</span>
		{
			category && (
				<span class="pcate">
					<i class="fa fa-folder-open-o" aria-hidden="true" />
					<a
						href={`/category/${encodeURIComponent(category)}/`}
						title={`查看${category}下的全部文章`}
					>
						{category}
					</a>
				</span>
			)
		}
		<span class="pview">
			<i class="fa fa-comments" aria-hidden="true"></i>
			{
				effectiveComments > 0 ? (
					<a
						title={`查看《${title}》的吐槽`}
						href={`${url}#comments`}
					>
						{effectiveComments}次吐槽
					</a>
				) : (
					<a title="抢沙发" href={`${url}#comments`}>
						抢沙发
					</a>
				)
			}
		</span>
	</div>

	<div class="post-content">
		<div class="post-thumbnail">
			<a href={url}>
				<img src={cover} alt={title} title={title} loading="lazy" />
			</a>
		</div>
		<div class="post-excerpt">{excerpt}</div>
		<div class="clear"></div>
		<div class="goon">
			<a href={url}>继续阅读&raquo;</a>
		</div>
	</div>
</article>
```

**行号定位**：`.post-content` = 第 97 行；`.post-thumbnail` = 第 98–102 行；`.post-excerpt` = 第 103 行；`.clear` = 第 104 行；`.goon` = 第 105–107 行（`<a href={url}>继续阅读&raquo;</a>` = 第 106 行）。

**总览页「照 PostCard 抄」的模板**：根 `article.post-list` → `header.post-header > h2` → 左位 `div.post-thumbnail`（内含 `<a><img></a>`）→ `div.post-excerpt` → `div.clear` → `div.goon > a`（文案改「进入目录 »」）。

**注意**：`PostCard` **不使用 `ResponsiveImage`**，是裸 `<img src={cover}>`。总览卡若要用 `ResponsiveImage` 需自行引入（spec 提到总览卡封面用同一张封面 + `getLqipProps`，但没明确要求 `ResponsiveImage`，实现子代理自行决定；注意 `.lqip-placeholder` 需要 `figure.lqip-wrap` 这类包装）。

---

## 8. `src/components/layout/Pagination.astro`（第 1–39 行为逻辑，40–213 行为模板）

### Props 类型（第 2–11 行）

```astro
interface Props {
	/** 当前页码（1 起） */
	current: number;
	/** 总页数 */
	total: number;
	/** 分页 URL 模板：/page/{n}/（{n} 会被替换；第 1 页固定为 /） */
	urlTemplate: string;
	/** 第 1 页地址 */
	firstPageUrl?: string;
}

const { current, total, urlTemplate, firstPageUrl = "/" } = Astro.props;
const pageUrl = (n: number) =>
	n === 1 ? firstPageUrl : urlTemplate.replace("{n}", String(n));
```

**要点**：
- `total > 1` 才渲染（第 42 行的 `{ total > 1 && (…)}`）——`total === 1` 时整块不出现
- `urlTemplate` 由调用侧用 `getPaginationUrl(rootUrl, "{n}")` 生成（见 §13/`src/utils/pagination.ts`）
- 输出 `nav.pagenavi`，当前页是 `<span class="pagenavi-page is-current" aria-current="page">`，可跳页 `<a class="pagenavi-page">`；另有首/前/后/末四枚控件与一个跳页 `<form>`

### 真实调用点 A —— `src/components/layout/TaxonomyListing.astro` 第 81–86 行（`/tag/`、`/category/` 共用列表体）

```astro
<Pagination
	current={current}
	total={total}
	urlTemplate={getPaginationUrl(rootUrl, "{n}")}
	firstPageUrl={rootUrl}
/>
```

### 真实调用点 B —— `src/pages/hot/index.astro` 第 39–44 行

```astro
	<Pagination
		current={1}
		total={pages}
		urlTemplate={getPaginationUrl(rootUrl, "{n}")}
		firstPageUrl={rootUrl}
	/>
```

`Pagination` 的全部调用点（`grep` 实测，共 7 处）：
`src/components/layout/TaxonomyListing.astro:81`、`src/pages/page/[page].astro:64`、`src/pages/archive/[year]/[month].astro:64`、`src/pages/index.astro:50`、`src/pages/hot/index.astro:39`、`src/pages/archive/[year]/[month]/page/[page].astro:73`、`src/pages/hot/page/[page].astro:57`。
——注意 **`tag/[tag].astro` / `tag/[tag]/page/[page].astro` 自己并不 import `Pagination`**，它们通过 `TaxonomyListing` 间接使用。

---

## 9. `src/components/widget/WidgetLayout.astro`（全文 23 行）

```astro
---
interface Props {
	title: string;
	icon?: string;
}

const { title, icon } = Astro.props;
---

<section class="widget">
	{
		icon && (
			<span class="icon">
				<i class={`fa ${icon}`} aria-hidden="true" />
			</span>
		)
	}
	<h2>
		{title}
		<slot name="actions" />
	</h2>
	<slot />
</section>
```

**要点**：
- 根元素 `section.widget`（外框样式由 `global.css` 的 `.widget` 提供）
- `icon` 可选，渲染为 `<span class="icon">`（`.widget > .icon` 是左侧 47×30 图标格）
- `<h2>` 内有具名插槽 `actions`（可放「换一批」之类的按钮）
- 默认插槽是内容体 —— 但注意 `.widget` 的相关样式里有 `.widget .widget-body`（第 679 行），既有 widget 自行选择是否套 `widget-body`
- `WidgetSeries` 按 spec 应写：`<WidgetLayout title="文集目录" icon="fa-list-ol"> …有序目录… </WidgetLayout>`

---

## 10. `src/components/widget/WidgetRelatedPosts.astro`（全文 61 行）

```astro
---
import WidgetLayout from "./WidgetLayout.astro";
import { getCollection } from "astro:content";
import dayjs from "dayjs";
import { isPublicPost, type Post } from "../../utils/content-utils";

// 仅在文章页侧栏显示：从 URL 提取当前文章 slug，按分类/标签相似度推荐
const slug = Astro.url.pathname.replace(/\/+$/, "").split("/")[2];
let related: Post[] = [];

if (slug) {
	const allPosts = (await getCollection("posts")).filter(isPublicPost);
	const current = allPosts.find((p) => p.id === slug);
	if (current) {
		const currentTags = new Set(current.data.tags);
		related = allPosts
			.filter((p) => p.id !== current.id)
			.map((p) => {
				let score = 0;
				if (
					p.data.category &&
					p.data.category === current.data.category
				) {
					score += 100;
				}
				for (const tag of p.data.tags) {
					if (currentTags.has(tag)) score += 10;
				}
				return {
					post: p,
					score,
					published: p.data.published.valueOf(),
				};
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score || b.published - a.published)
			.slice(0, 6)
			.map((item) => item.post);
	}
}
---

{
	related.length > 0 && (
		<WidgetLayout title="相关文章推荐" icon="fa-random">
			<ul id="relatedlog">
				{related.map((post) => (
					<li>
						<i class="fa fa-angle-right" aria-hidden="true" />
						<a href={`/posts/${post.id}/`} title={post.data.title}>
							{post.data.title}
						</a>
						<span>
							{dayjs(post.data.published).format("MM-DD")}
						</span>
					</li>
				))}
			</ul>
		</WidgetLayout>
	)
}
```

### 「从 URL 取当前文章」的做法（第 8 行，逐行说明）

```js
const slug = Astro.url.pathname.replace(/\/+$/, "").split("/")[2];
```

- `Astro.url.pathname`：当前请求路径，例如 `/posts/20261002204249/`
- `.replace(/\/+$/, "")`：去掉**结尾的全部斜杠** → `/posts/20261002204249`
- `.split("/")`：按 `/` 切分 → `["", "posts", "20261002204249"]`
- `[2]`：取第 3 段（索引 2）→ `"20261002204249"`

**含义**：`slug` 只在路径形如 `/posts/<id>/` 时非空且等于文章 id；其它页面（首页 `/` → `[""]` → `[2]` 是 `undefined`；`/tag/x/` → `["","tag","x"]` → `"x"`，是个标签名不是文章 id）会取到不匹配的值。组件随后用 `allPosts.find((p) => p.id === slug)` 兜底——找不到 `current` 就保持 `related = []`，于是整块不渲染。**所以它是「路径恰好是文章页」的自判定，不需要页面级 prop。**

**`WidgetSeries` 照此办理**：`const slug = Astro.url.pathname.replace(/\/+$/, "").split("/")[2];` → 用 `allPosts.find(p => p.id === slug)` 拿到当前文章 → 判 `isSeriesMember(current)` → 按 `seriesOrder` 列出成员 → `current` 项加 `.current` + `aria-current`。

**副作用提示**：这条 `split("/")[2]` 在 `/series/<slug>/` 目录页上也会取到 `"<slug>"`（如 `"webapp-vibe-coding"`），但文章 id 是 14 位数字串，`find` 不会命中，所以侧栏目录在目录页不会渲染——符合预期。

---

## 11. `src/components/layout/SideBar.astro`（全文 40 行）

```astro
---
import WidgetBlogger from "../widget/WidgetBlogger.astro";
import WidgetWeather from "../widget/WidgetWeather.astro";
import WidgetSearch from "../widget/WidgetSearch.astro";
import WidgetSort from "../widget/WidgetSort.astro";
import WidgetTag from "../widget/WidgetTag.astro";
import WidgetArchive from "../widget/WidgetArchive.astro";
import WidgetNewLog from "../widget/WidgetNewLog.astro";
import WidgetHotLog from "../widget/WidgetHotLog.astro";
import WidgetRelatedPosts from "../widget/WidgetRelatedPosts.astro";
import WidgetNewComm from "../widget/WidgetNewComm.astro";
import WidgetLink from "../widget/WidgetLink.astro";
import WidgetTwitter from "../widget/WidgetTwitter.astro";
import WidgetCalendar from "../widget/WidgetCalendar.astro";
import { sidebarConfig } from "../../config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgetMap: Record<string, any> = {
	weather: WidgetWeather,
	blogger: WidgetBlogger,
	search: WidgetSearch,
	sort: WidgetSort,
	tag: WidgetTag,
	archive: WidgetArchive,
	newlog: WidgetNewLog,
	hotlog: WidgetHotLog,
	related: WidgetRelatedPosts,
	newcomm: WidgetNewComm,
	link: WidgetLink,
	twitter: WidgetTwitter,
	calendar: WidgetCalendar,
};
const widgets = sidebarConfig.widgets
	.map((name) => widgetMap[name])
	.filter(Boolean);
---

<aside id="sidebar" role="complementary" data-pagefind-ignore="all">
	{widgets.map((Comp) => <Comp />)}
</aside>
```

**`widgetMap` 定义 = 第 18–32 行**（`Record<string, any>`，键 → 组件）。**import 一律用相对路径 `../widget/Xxx.astro`。**
**注册方式**：① 顶部加 `import WidgetSeries from "../widget/WidgetSeries.astro";`；② 在 `widgetMap` 里加 `series: WidgetSeries,`；③ 在 `src/config.ts` 的 `sidebarConfig.widgets` 里把 `"series"` 插到 `"related"` 之前。
**渲染**：`widgets = sidebarConfig.widgets.map(name => widgetMap[name]).filter(Boolean)` —— 未知键会被 `filter(Boolean)` 静默丢掉（所以「注册了但没进 config」= 不显示）。
`<aside id="sidebar">` 带 `data-pagefind-ignore="all"`。

---

## 12. `src/config.ts` 相关段落

### `siteConfig.postsPerPage`（第 29–30 行）

```ts
	/** 每页文章数（全部列表页共用：首页、分类、标签、月归档、热门） */
	postsPerPage: 10,
```

**值 = `10`，在第 30 行。**（spec 说「现为 10」准确；目录页分页沿用此值。）

### `navBarConfig.archiveSite`（第 56–62 行）

```ts
	/** 文章归档下拉菜单 */
	archiveSite: [
		{ name: "全部文章", url: "/archive/" },
		{ name: "标签分类", url: "/tag/" },
		{ name: "文章分类", url: "/category/" },
		{ name: "热门推荐", url: "/hot/" },
	],
```

**数组 = 第 57–62 行**，「文章分类」= 第 60 行 → 在它之后插入 `{ name: "文章文集", url: "/series/" }`（插在 60 与 61 之间）。
**注意**：`AGENTS.md` 第 316 行明确「下拉渲染分列在 `Navbar.astro`（桌面 hover 下拉）与 `MMenu.astro`（移动端全屏菜单），**两处必须同步修改**」——但两处都遍历 `archiveSite` 数组，所以**只改 `config.ts` 数组即可**，无需改两个组件（它们消费同一数组）。实现子代理应确认 `Navbar.astro`/`MMenu.astro` 是否硬编码四项。

### `sidebarConfig.widgets`（第 95–112 行）

```ts
/** 侧栏小部件配置（对应 Emlog 后台 widgets1 排序） */
export const sidebarConfig = {
	/** 依次显示的小部件（hotlog 仅首页显示、related 仅文章页显示，由各自组件按 URL 判断） */
	widgets: [
		"weather",
		"blogger",
		"search",
		"sort",
		"tag",
		"archive",
		"newlog",
		"hotlog",
		"related",
		"newcomm",
		"link",
		"twitter",
	],
};
```

**数组 = 第 98–111 行**，`"related"` = 第 107 行 → `"series"` 插在第 106 与 107 之间（即 `"hotlog"` 之后、`"related"` 之前）。

---

## 13. 路由样板（四个文件全文）

### 13a. `src/pages/tag/[tag].astro`（第 1 页，全文 52 行）

```astro
---
import MainGridLayout from "../../layouts/MainGridLayout.astro";
import TaxonomyListing from "../../components/layout/TaxonomyListing.astro";
import { getCollection } from "astro:content";
import {
	getSortedPosts,
	getTagList,
	isPublicPost,
} from "../../utils/content-utils";
import { getPaginationUrl } from "../../utils/pagination";
import { siteConfig } from "../../config";

export async function getStaticPaths() {
	const allPosts = await getCollection("posts");
	const publicPosts = allPosts.filter(isPublicPost);
	const sortedPosts = getSortedPosts(publicPosts);
	const tags = getTagList(publicPosts);
	return tags.map(({ name }) => {
		const posts = sortedPosts.filter((post) =>
			post.data.tags.includes(name),
		);
		return {
			params: { tag: name },
			props: { name, posts, tags },
		};
	});
}

const { name, posts, tags } = Astro.props;
const rootUrl = `/tag/${encodeURIComponent(name)}/`;
const pages = Math.max(1, Math.ceil(posts.length / siteConfig.postsPerPage));
const pagePosts = posts.slice(0, siteConfig.postsPerPage);
---

<MainGridLayout
	title={`标签：${name}`}
	description={`标签 ${name} 下的全部文章`}
	canonicalUrl={rootUrl}
	nextUrl={pages > 1 ? getPaginationUrl(rootUrl, 2) : undefined}
>
	<TaxonomyListing
		kind="tag"
		name={name}
		list={tags}
		totalCount={posts.length}
		posts={pagePosts}
		current={1}
		total={pages}
		rootUrl={rootUrl}
	/>
</MainGridLayout>
```

**写法要点**：`getStaticPaths` 是**非 async 箭头**返回数组（用 `params`），第 1 页**手写切片**（`posts.slice(0, postsPerPage)`），页数用 `Math.ceil`；`MainGridLayout` 传 `canonicalUrl` + `nextUrl`，**不传 `searchIndex`**（缺省 `false`），**无 `data-no-swup`**。

### 13b. `src/pages/tag/[tag]/page/[page].astro`（分页变体，全文 65 行）

```astro
---
import MainGridLayout from "../../../../layouts/MainGridLayout.astro";
import TaxonomyListing from "../../../../components/layout/TaxonomyListing.astro";
import { getCollection } from "astro:content";
import type { GetStaticPaths } from "astro";
import {
	getSortedPosts,
	getTagList,
	isPublicPost,
} from "../../../../utils/content-utils";
import { getPaginationUrl, getPageMeta } from "../../../../utils/pagination";
import { siteConfig } from "../../../../config";

export const getStaticPaths = (async ({ paginate }) => {
	const allPosts = await getCollection("posts");
	const publicPosts = allPosts.filter(isPublicPost);
	const sortedPosts = getSortedPosts(publicPosts);
	const tags = getTagList(publicPosts);
	return tags.flatMap(({ name }) =>
		paginate(
			sortedPosts.filter((post) => post.data.tags.includes(name)),
			{
				params: { tag: name },
				props: { tags },
				pageSize: siteConfig.postsPerPage,
			},
		),
	);
}) satisfies GetStaticPaths;

const { page, tags } = Astro.props;
const name = Astro.params.tag;
const rootUrl = `/tag/${encodeURIComponent(name)}/`;
const meta = getPageMeta(
	{
		title: `标签：${name}`,
		description: `标签 ${name} 下的全部文章`,
	},
	page.currentPage,
);
---

<MainGridLayout
	title={meta.title}
	description={meta.description}
	canonicalUrl={getPaginationUrl(rootUrl, page.currentPage)}
	prevUrl={page.currentPage > 1
		? getPaginationUrl(rootUrl, page.currentPage - 1)
		: undefined}
	nextUrl={page.currentPage < page.lastPage
		? getPaginationUrl(rootUrl, page.currentPage + 1)
		: undefined}
>
	<TaxonomyListing
		kind="tag"
		name={name}
		list={tags}
		totalCount={page.total}
		posts={page.data}
		current={page.currentPage}
		total={page.lastPage}
		rootUrl={rootUrl}
	/>
</MainGridLayout>
```

**分页路径生成**：靠 Astro 的 `paginate(array, { params, props, pageSize })`，`index` 参数缺省 → 第 1 页落 `page/1`，第 2 页落 `page/2`……（但**第 1 页的 canonical 指回根页**，见 `getPageMeta` 注释）；`getStaticPaths` 用 `satisfies GetStaticPaths` 标注，**是 async 且解构 `{ paginate }`**。
**注意**：分页变体**会**把 `prevUrl` / `nextUrl` 传给 `MainGridLayout`（所以分页页有 `<link rel="prev/next">`）——这与文章页不同。

### 13c. `src/pages/tag/index.astro`（索引页，全文 32 行）

```astro
---
import MainGridLayout from "../../layouts/MainGridLayout.astro";
import ListingHeader from "../../components/layout/ListingHeader.astro";
import TagCloud3D from "../../components/layout/TagCloud3D.astro";
import TagPillCloud from "../../components/layout/TagPillCloud.astro";
import { getCollection } from "astro:content";
import { getTagList, isPublicPost } from "../../utils/content-utils";

const allPosts = await getCollection("posts");
const publicPosts = allPosts.filter(isPublicPost);
const tags = getTagList(allPosts);
---

<MainGridLayout title="标签云集" description="全站标签总览，按文章数排序">
	<div class="page tags-page">
		<ListingHeader
			icon="fa-tags"
			title="标签云集"
			crumbs={[{ label: "标签云集", icon: "fa-tags" }]}
		/>

		<div class="post-context">
			<p>共 {tags.length} 个标签 · 收录 {publicPosts.length} 篇文章</p>
			{tags.length === 0 && <p>暂无标签。</p>}
		</div>

		{tags.length > 0 && <TagCloud3D items={tags} base="tag" />}

		{tags.length > 0 && <TagPillCloud items={tags} base="tag" />}
	</div>
</MainGridLayout>
```

**索引页骨架（`/series/` 总览页直接照抄这个骨架）**：`<MainGridLayout title=… description=…>` → `<div class="page xxx-page">` → `<ListingHeader …/>` → `<div class="post-context"><p>共 N 个…</p></div>` → 卡片列表。**不传 `canonicalUrl` / `searchIndex` / `data-no-swup`。**

### 13d. `src/pages/category/[category].astro`（全文 50 行）

```astro
---
import MainGridLayout from "../../layouts/MainGridLayout.astro";
import TaxonomyListing from "../../components/layout/TaxonomyListing.astro";
import { getCollection } from "astro:content";
import {
	getCategoryList,
	getSortedPosts,
	isPublicPost,
} from "../../utils/content-utils";
import { getPaginationUrl } from "../../utils/pagination";
import { siteConfig } from "../../config";

export async function getStaticPaths() {
	const allPosts = await getCollection("posts");
	const publicPosts = allPosts.filter(isPublicPost);
	const sortedPosts = getSortedPosts(publicPosts);
	const categories = getCategoryList(publicPosts);
	return categories.map(({ name }) => {
		const posts = sortedPosts.filter((post) => post.data.category === name);
		return {
			params: { category: name },
			props: { name, posts, categories },
		};
	});
}

const { name, posts, categories } = Astro.props;
const rootUrl = `/category/${encodeURIComponent(name)}/`;
const pages = Math.max(1, Math.ceil(posts.length / siteConfig.postsPerPage));
const pagePosts = posts.slice(0, siteConfig.postsPerPage);
---

<MainGridLayout
	title={`分类：${name}`}
	description={`分类 ${name} 下的全部文章`}
	canonicalUrl={rootUrl}
	nextUrl={pages > 1 ? getPaginationUrl(rootUrl, 2) : undefined}
>
	<TaxonomyListing
		kind="category"
		name={name}
		list={categories}
		totalCount={posts.length}
		posts={pagePosts}
		current={1}
		total={pages}
		rootUrl={rootUrl}
	/>
</MainGridLayout>
```

与 `tag/[tag].astro` 同构，只换 `kind` / 数据源 / `params` 键。

### 13e. `src/utils/pagination.ts`（全文 30 行，实现子代理需要）

```ts
/**
 * Build the canonical root URL for page one and the native nested URL for
 * subsequent pages. The string form is used by Pagination's URL template.
 */
export function getPaginationUrl(
	rootUrl: string,
	page: number | string,
): string {
	const root = rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`;
	if (page === 1 || page === "1") return root;
	return `${root.slice(0, -1)}/page/${page}/`;
}

/**
 * 分页路由的 title/description 生成器：第 1 页原样返回，第 ≥2 页追加页码，
 * 否则第 2 页与第 1 页共用同一条标题与描述，读者与搜索引擎都无法区分。
 * 注意 `paginate()` 会为每个列表都产出第 1 页，因此各调用点仍会拿到一份与根页
 * 同题的第 1 页产物（首页由 `getPaginationUrl` 指向根 URL，其余分页路由的第 1 页
 * 只是 canonical 指回根页）。
 */
export function getPageMeta(
	base: { title: string; description: string },
	current: number,
): { title: string; description: string } {
	if (current <= 1) return base;
	return {
		title: `${base.title} · 第 ${current} 页`,
		description: `${base.description}（第 ${current} 页）`,
	};
}
```

**`getPaginationUrl(rootUrl, "{n}")`** → 第 1 页给 `rootUrl`，其余给 `${rootUrl去掉尾斜杠}/page/{n}/`。

---

## 14. `src/layouts/MainGridLayout.astro`（全文 100 行）

### Props（第 10–25 行）

```astro
interface Props {
	title?: string;
	description?: string;
	image?: string;
	canonicalUrl?: string;
	prevUrl?: string;
	nextUrl?: string;
	/** og:type（文章页传 "article"） */
	ogType?: string;
	/** 是否显示侧栏 */
	showSidebar?: boolean;
	/** 是否将当前页面正文加入 Pagefind 索引 */
	searchIndex?: boolean;
}

const { showSidebar = true, searchIndex = false } = Astro.props;
```

**`searchIndex` 缺省值 = `false`（第 25 行）** —— 所以 `/series/*` 不传即不进 Pagefind 索引，与 `/tag/` `/category/` 一致。

### `image` 的传递链（第 28–36 行）

```astro
<Layout
	title={Astro.props.title}
	description={Astro.props.description}
	image={Astro.props.image}
	canonicalUrl={Astro.props.canonicalUrl}
	prevUrl={Astro.props.prevUrl}
	nextUrl={Astro.props.nextUrl}
	ogType={Astro.props.ogType}
>
```

**链条**：页面 → `<MainGridLayout image={…}>` → `<Layout image={…}>` → `Layout.astro:44` 的 `ogImageUrl = absoluteUrl(image ?? "/images/avatar.webp")` → `<meta property="og:image" content={ogImageUrl}>`（`Layout.astro:89`）。

### `<main id="main">` 与 `#content` 的 DOM 结构（第 39–65 行）

```astro
	<div id="lmhblog">
		<Navbar />

		<div id="wrapper" class="wrapper-box">
			<main id="main" class="transition-swup-fade">
				<!-- 页面级标题插槽：给正文区没有自然 h1 的页面（首页）用。
				     放在 #content 之外，是因为卡片下划线按 `.post-list:nth-child` 取色，
				     任何进入 #content 的前置兄弟节点都会让整排色带位移。 -->
				<slot name="heading" />
				<div id="container">
					<div id="anitOut"></div>
					<div
						class:list={[
							"main-grid",
							!showSidebar && "main-grid-full",
						]}
					>
						<div
							id="content"
							data-pagefind-body={searchIndex ? true : undefined}
						>
							<slot />
						</div>
						{showSidebar && <SideBar />}
					</div>
				</div>
			</main>

			<div class="clear"></div>
			<BackToTop />
		</div>
```

**行号**：`<main id="main">` = 第 43 行；`<slot name="heading" />` = 第 47 行；`<div id="container">` = 第 48 行；`.main-grid` = 第 50–55 行；**`<div id="content" data-pagefind-body>` = 第 56–61 行**；**`{showSidebar && <SideBar />}` = 第 62 行**。

**关键约束（第 44–46 行注释原文）**：「任何进入 `#content` 的前置兄弟节点都会让整排色带位移」——即页面里塞进 `#content` 的第一个子节点会改变 `.post-list:nth-child(N)` 的序号，色彩带随之整体位移。**共享 `PostCard` 的列表页（含新目录页）不要在前置位置加兄弟节点；若必须加，需同步 `.post-list:nth-child(N)::after` 枚举深度。** `slot="heading"` 是**在 `#content` 之外**的既有出路。

### 其余部分（第 66–99 行）

`<div class="clear">` / `<BackToTop />` / `</div>` → `<QuoteBand />`（swup 容器外）→ `<Footer />` / `<MMenu />` / loading frame；最后是 swup 显隐的内联 `<script>`。**`QuoteBand` 在 swup 容器之外**（第 71–72 行注释）。

---

## 15. `src/layouts/Layout.astro` 的 `og:image` / 头像降级

### 变量（第 35–44 行）

```astro
const { title, description, image, canonicalUrl, prevUrl, nextUrl, ogType } =
	Astro.props;

const siteTitle = title ? `${title} - ${siteConfig.title}` : siteConfig.title;
const siteDescription = description ?? siteConfig.subtitle;
const absoluteUrl = (relativeUrl: string) =>
	new URL(relativeUrl, siteConfig.siteURL).toString();
const canonicalHref = absoluteUrl(canonicalUrl ?? Astro.url.pathname);
// og:image / twitter:image 必须输出绝对地址（部分平台不识别相对 URL）
const ogImageUrl = absoluteUrl(image ?? "/images/avatar.webp");
```

**头像降级 = 第 44 行**（spec 说的「约 :44」准确）：`const ogImageUrl = absoluteUrl(image ?? "/images/avatar.webp");`

### 消费点（第 86–96 行）

```astro
		<meta property="og:title" content={siteTitle} />
		<meta data-pagefind-meta="title[content]" content={siteTitle} />
		<meta property="og:description" content={siteDescription} />
		<meta property="og:image" content={ogImageUrl} />
		<meta property="og:url" content={canonicalHref} />
		<meta property="og:site_name" content={siteConfig.title} />
		<meta property="og:type" content={ogType ?? "website"} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={siteTitle} />
		<meta name="twitter:description" content={siteDescription} />
		<meta name="twitter:image" content={ogImageUrl} />
```

`og:image` = 第 89 行，`twitter:image` = 第 96 行。
**`prevUrl` / `nextUrl` 的消费点在第 64–65 行**：`{prevUrl && <link rel="prev" href={absoluteUrl(prevUrl)} />}` / `{nextUrl && <link rel="next" href={absoluteUrl(nextUrl)} />}` —— 文章页不传这两个 prop，故不发射。

**对封面回退的处理**：`resolveSeriesCover` 返回 `string | null`；为 `null` 时不传 `image` 给 `MainGridLayout`（写成 `image={cover ?? undefined}`），即自动落回这里的 `/images/avatar.webp`。

---

## 16. `src/styles/global.css`（7100 行）

**结构前提（`AGENTS.md` 第 302 行）**：Tailwind v3 的 `@layer base/components/utilities` 是**构建期指令**，产物里不存在 `@layer`——**冲突一律按「特异性 → 源顺序」判定**。所以源码里先写在 `@layer components` 内、后写在无层块里的同名规则，**后者生效**。本节两套都列。

### 16a. `:root` token（第 10–36 行，位于 `@layer base` 内，两空格缩进）

```css
@layer base {
  :root {
    /* 品牌绿单一真源是 --colorful-green（本文件后段）；Tailwind config 的 primary
       hex 需与其人工同步——bg-primary/N 透明度修饰符要求静态色值，不能用 var */
    --primary: var(--colorful-green);
    --primary-dark: #0a0;
    --hot: #ffba00;
    --new: #00c700;
    --page-bg: #f4f5f7;
    --card-bg: #fff;
    --content-surface: rgba(255, 255, 255, 0.86);
    --content-surface-nested: rgba(255, 255, 255, 0.84);
    --border: #eaeaea;
    --line: #ddd;
    --text: #000;
    /* 次要文字只认一个来源：--colorful-text-secondary（#666，对白底实测 5.74:1）。
       旧值 #767676 实测 4.54:1，虽刚过 AA 线却与其它灰值不同源，故并轨为别名 */
    --text-light: var(--colorful-text-secondary);
    --text-gray: #505050;
    --shadow-wrapper: 0 2px 6px rgba(100, 100, 100, 0.3);
    /* 站点自有光标只有两枚资源（箭头 + 手型），单源在此。凡可点元素必须取
       --cursor-link：类选择器里裸写 cursor: pointer 会以 (0,1,0) 压过全局
       `a, button` 的 (0,0,1)，把指针静默退回系统手型（2026-09-30 侧栏刷新/
       换一批就是这么丢的），smoke:ui 的手型负扫守这条。 */
    --cursor-default: url(/style/default.cur), default;
    --cursor-link: url(/style/link.cur), pointer;
  }
```

| token | 行号 | 值 |
| --- | --- | --- |
| `--primary` | 14 | `var(--colorful-green)` |
| `--primary-dark` | 15 | `#0a0` |
| `--hot` | 16 | `#ffba00` |
| `--new` | 17 | `#00c700` |
| `--page-bg` | 18 | `#f4f5f7` |
| `--card-bg` | 19 | `#fff` |
| `--content-surface` | 20 | `rgba(255, 255, 255, 0.86)` |
| `--content-surface-nested` | 21 | `rgba(255, 255, 255, 0.84)` |
| `--border` | 22 | `#eaeaea` |
| `--line` | 23 | `#ddd` |
| `--text` | 24 | `#000` |
| `--text-light` | 27 | `var(--colorful-text-secondary)` → `#666` |
| `--text-gray` | 28 | `#505050` |
| `--shadow-wrapper` | 29 | `0 2px 6px rgba(100, 100, 100, 0.3)` |
| `--cursor-default` | 34 | `url(/style/default.cur), default` |
| `--cursor-link` | 35 | `url(/style/link.cur), pointer` |

**后段还有两组 `:root`**（无层，两空格缩进）：

- **第 1720–1722 行**：`--colorful-green: #00c000;`（第 1721 行）、`--colorful-line: #ddd;`（第 1722 行）
- **第 5162–5164 行**：`--colorful-green-accessible: #007a00;`（第 5163 行）、`--colorful-text-secondary: #666;`（第 5164 行）

所以 `var(--line)` 与 `var(--colorful-line)` **同值 `#ddd`**；`var(--text-light)` 与 `var(--colorful-text-secondary)` **同值 `#666`**。

### 16b. `.page .post-cover`（第 437–451 行，`@layer components` 内）

```css
  /* 文章头图：横幅裁切 + 底缘渐隐，衔接标题正文 */
  .page .post-cover {
    height: 260px;
    margin: 0 0 16px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
  }
  .page .post-cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
```

**`height: 260px` = 第 439 行**；`mask-image … #000 55%` = 第 442–443 行；`img { object-fit: cover }` = 第 449 行。
- **选择器自带 `.page` 前缀**，目录页只要容器是 `.page` 就直接命中（spec 第 132 行准确）
- **实测：该 `@media` 覆盖缺失** —— 全文 grep 无任何 `max-width` 媒体查询里出现 `.post-cover`，故**窄屏同为 260px**（spec 第 132 行准确）
- **注意**：`figure.post-cover` 在文章页还有 `.lqip-wrap` / `.lqip-placeholder` 配套（`.lqip-placeholder` 定义在 `global.css:6088`）

### 16c. `.post-context`（第 452–459 行，`@layer components`；**已被第 3110 覆盖**）

```css
  .post-context {
    padding-top: 10px;
    line-height: 1.8;
  }
  .post-context img {
    max-width: 100%;
    height: auto;
  }
```

**生效版（无层，第 3110–3117 行）**：

```css
.post-context {
  position: relative;
  margin-top: 3px;
  padding: 0;
  font-size: inherit;
  line-height: 24px;
  word-break: break-all;
}
```

（还有 `.post-context p { margin: 0 0 15px }` @3119–3121 等后续规则。）

### 16d. `.post-metaa`（第 461–476 行，`@layer components`；**已被第 2931 覆盖**）

```css
  /* 文章 meta（对应 .post-metaa，面包屑 + 工具条） */
  .post-metaa {
    margin-top: 0;
    margin-bottom: 10px;
    padding: 10px 0 1px;
    border-bottom: 1px dotted var(--line);
    color: var(--text-light);
    font-style: normal;
    font-size: 12px;
  }
  .post-metaa a {
    color: var(--text-light);
  }
  .post-metaa a:hover {
    color: var(--primary);
  }
```

行号：`.post-metaa` = 462–470；`.post-metaa a` = 471–473；`.post-metaa a:hover` = 474–476。

**生效版（无层，第 2931–2950 行）** —— 这条源顺序更靠后、同特异性，赢：

```css
.post-metaa,
.entry-meta {
  margin-top: -8px;
  margin-bottom: 10px;
  padding: 10px 0 1px;
  border-bottom: 1px dotted var(--colorful-line);
  color: var(--colorful-text-secondary);
  font-size: 12px;
  font-style: normal;
}

.post-metaa a,
.entry-meta a {
  color: var(--colorful-text-secondary);
}

.post-metaa a:hover,
.entry-meta a:hover {
  color: var(--colorful-green);
}
```

**实现子代理取用**：新两行提示的「12px + 灰字 + hover 品牌绿」应取 `font-size: 12px` + `color: var(--text-light)`（=`#666`）+ `a:hover { color: var(--primary) }`。**不带上边框**（`.post-metaa` 自己已画 `1px dotted`）。`var(--primary)` 与 `var(--colorful-green)` 恒等（前者就是后者的别名）。

### 16e. `.post-list` 系（**生效版**，无层，第 2476–2541 行）

```css
.post-list {
  position: relative;
  margin: 0 0 20px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--colorful-line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.post-list:hover {
  box-shadow: none;
}

.post-list::after {
  position: absolute;
  bottom: -1px;
  left: 0;
  display: block;
  width: 190px;
  height: 1px;
  background: var(--colorful-green);
  content: "";
  transition: width 0.3s ease-in-out;
}
```

### 16f. `.post-list:nth-child(N)::after` 色带枚举的完整范围（第 2503–2541 行）

```css
.post-list:nth-child(2)::after {
  background: #ff0688;
}
.post-list:nth-child(3)::after {
  background: #ffd700;
}
.post-list:nth-child(4)::after {
  background: #39c;
}
.post-list:nth-child(5)::after {
  background: #8b008b;
}
.post-list:nth-child(6)::after {
  background: #0cf;
}
.post-list:nth-child(7)::after {
  background: #f00;
}
.post-list:nth-child(8)::after {
  background: var(--colorful-green);
}
.post-list:nth-child(9)::after {
  background: #f0f;
}
/* 每页 10 条后色带要铺到 nth-child(12)：首页首卡前有 2 个兄弟节点，末位卡即第 12 项
   （/hot/ 首卡前 1 个 → 到 11，其余列表页不超过 5）。色值取自 colorful-original.css
   的 10/11/12 位，实测六类列表页无一经由此范围之外的序号。 */
.post-list:nth-child(10)::after {
  background: #00f;
}
.post-list:nth-child(11)::after {
  background: #000;
}
.post-list:nth-child(12)::after {
  background: #ff8c00;
}
```

**范围 = 第 2503 行（`nth-child(2)`）到第 2538 行（`nth-child(12)` 规则体结束），随后是第 2539–2541 行的 `.post-list:hover::after { width: 100% }`。**
**未命中的序号静默落回基色 `var(--colorful-green)`**（`::after` 上定义的 `background`）。**枚举深度必须盖过「每页条数 10 + 首卡之前的兄弟节点数」**——`/series/<slug>/` 目录页若沿用 `PostCard`，首卡前的兄弟节点数决定起始 `nth-child`，实现子代理需按 `AGENTS.md` 第 421 行的方法「在真实列表页上量」确定是否需要补枚举。

### 16g. `.post-header`（**生效版**，无层，第 2543–2589 行）

```css
.post-list .post-header,
.post-header {
  margin-left: -20px;
  padding: 0 0 0 20px;
  border: 0;
  border-left: 3px solid #000;
}

.post-list .post-header h2,
.post-header h2 {
  display: block;
  overflow: hidden;
  width: 100%;
  height: 25px;
  margin: 0;
  color: #000;
  font-size: 18px;
  font-weight: bold;
  line-height: 25px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 与列表卡标题在同名选择器家族下故意分叉（ADR-0003）：文章页 h1 是本页唯一标题，
   完整可读优先于单行对齐；字号沿用原组合规则的值，只改高度与换行三项。 */
.post-list .post-header h1,
.post-header h1 {
```

（`.post-header h2 a` @2582、`:hover` @2587；`.post-header h1` 规则体在其后。）
**要点**：`.post-header h2` 是**单行 25px 截断**（`white-space: nowrap` + `text-overflow: ellipsis`）；`.post-header` 有左侧 3px 黑竖线。`@layer components` 内也有一份同名规则（第 432–436 行 `.page .post-header h1/h2 { margin: 0; font-size: 20px }`）。

### 16h. `.post-thumbnail`（**生效版**，无层，第 2654–2676 行）

```css
.post-thumbnail {
  position: relative;
  float: left;
  overflow: hidden;
  box-sizing: content-box;
  width: 160px;
  height: 120px;
  margin: 2px 10px 10px 0;
  padding: 3px;
  border: 1px solid #e6e6e6;
}

.post-thumbnail:hover {
  border-color: var(--colorful-green);
}

.post-thumbnail img {
  width: 160px;
  height: 120px;
  border: 0;
  border-radius: 3px;
  object-fit: cover;
}
```

`@layer components` 内的旧版（第 344–355 行）是 `float: left; width: 150px` + `img { width: 150px; height: 90px }`——**已被上面的 160×120 覆盖**（见 §与 spec 的出入 第 4 条）。
另有窄屏媒体查询：第 5021–5028 行（`@media screen and (max-width: 680px)`）`width: 160px` / `img 160×120`；第 5682–5689 行（`@media screen and (max-width: 360px)`）`width: 120px` / `img 120×90`。

### 16i. `.post-excerpt` / `.goon`（**生效版**，无层，第 2678–2708 行）

```css
.post-excerpt {
  display: block;
  overflow: hidden;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
  word-break: break-all;
}

.goon {
  clear: none;
  padding: 0;
}

.goon a {
  float: right;
  display: inline-block;
  margin-top: -29px;
  padding: 2px 5px;
  border: 1px solid var(--colorful-line);
  border-radius: 0;
  background: transparent;
  color: var(--colorful-text-secondary);
  font-size: 12px;
  line-height: 24px;
}

.goon a:hover {
  background: transparent;
  color: var(--colorful-green);
}
```

`@layer components` 内的旧版在第 356–377 行（`.post-excerpt { color: #555; font-size: 13px }`、`.goon { clear: both; padding-top: 8px; text-align: right }`、`.goon a` 是品牌色边框按钮）——**已被覆盖**：生效版 `.goon a` 是**右上浮的细边框小按钮**（`margin-top: -29px` + `float: right`）。
**窄屏注意**：第 4901 行起的 `@media screen and (max-width: 680px)` 里 `.goon { display: none !important }`（第 4913 行）——≤680px 时 `.goon` 整块隐藏。

### 16j. `.cutline`（**生效版**，无层，第 3237–3256 行）

```css
.cutline {
  width: 100%;
  height: 1px;
  margin: 20px 0 0;
  border: 0;
  border-top: 1px dotted #ccc;
  text-align: center;
}

.cutline span {
  position: relative;
  top: -14px;
  padding: 2px 4px;
  border: 1px solid #d6d6d6;
  background: #f7f7f9;
  color: #d14;
  font:
    12px Arial,
    "Microsoft JhengHei";
}
```

`@layer components` 内的旧版在第 525–539 行（`height: 10px; border-top: 1px solid var(--line)`；`.cutline span { top: -9px; background: #fff; color: var(--text-light) }`）——**已被覆盖**。
**末尾归属行的插入位置**：`.cutline` 之下、`.post-navigation` 之上（见 §5，DOM 第 260 行附近）。

### 16k. `.post-navigation`（**生效版**，无层，第 3258–3390 行）

```css
.post-navigation a {
  position: fixed;
  bottom: 20%;
  z-index: 1000;
  display: block;
  width: 100px;
  height: 100px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  text-align: left;
  transform: translateY(-50%);
}

.post-navigation a.prev {
  left: 0;
}
.post-navigation a.next {
  right: 0;
}

.post-navigation .icon-wrap {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}
```

（后续：`a::before/::after` 三角与色块 @3287–3334、`.post-navigation h3 { margin: 0; font-size: 13px; font-weight: normal }` @3335、`.post-navigation-title` @3357、`.post-navigation a.prev h3` / `a.next h3` 对齐 @3365/3370、`:hover` @3376–3386。）
**关键事实**：**生效版把 prev/next 按钮做成「固定在视口左右两侧的 100×100 悬浮箭头」**（`position: fixed` + `z-index: 1000`），不是普通内联按钮。`@layer components` 内的旧版（第 542–571 行）是 `max-width: 48%` 的普通左右浮动块——**不生效**。
**层叠表**（`AGENTS.md` 第 417 行）：`.post-navigation a` z-index `1000` 是既定契约值之一。
**窄屏**：第 4915 行 `@media screen and (max-width: 680px)` 里 `.post-navigation { display: none !important }`。

### 16l. `.widget`（两套）

`@layer components` 内（第 662–712 行）：

```css
  /* ---------- 侧栏小部件（对应 .widget） ---------- */
  .widget {
    margin-bottom: 10px;
    background-color: #fff;
    border: 1px solid var(--border);
    border-radius: 5px;
    overflow: hidden;
  }
```

**生效版（无层，第 3388–3425 行）**：

```css
.widget {
  overflow: visible;
  margin-bottom: 10px;
  border: 1px solid #eaeaea;
  border-radius: 0;
  background: var(--content-surface-nested);
}

.widget > h2 {
  box-sizing: border-box;
  height: 30px;
  margin: 0;
  padding: 0 10px;
  border-bottom: 1px solid #eaeaea;
  color: #000;
  font-size: 14px;
  line-height: 30px;
}

.widget > .icon + h2 {
  text-indent: 10px;
}

.widget > .icon {
  display: flex;
  float: left;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 47px;
  min-width: 47px;
  height: 30px;
  margin: 0;
  padding: 0;
  border-right: 1px solid #dadada;
  background: #fbfbfb;
  line-height: 1;
}
```

（`.widget` 生效版是**直角 + 半透明白底 + 1px `#eaeaea` 边框**；`.widget > .icon` 是左侧 47×30 图标格。注意 `.icon` 与 `h2` 是同层兄弟，故 `h2` 上的 `text-indent: 10px` 由 `.icon + h2` 给出。）
另有窄屏相关：第 6202 行 `.widget:has(.weather-widget-body)`（天气卡专用）。

### 16m. `.blogtags` 系（无层）

**六色变量（第 3770–3781 行）**：

```css
/* 药丸 6 色轮换盘：背景与 ::before 三角共用同一变量（原版每色写两遍，现收敛于此） */
.blogtags,
.post-tags {
  /* 六色配白字必须达 WCAG AA（≥4.5:1），故较原版整体压暗；c5 压得最深（白字 11.94，远超门槛）不是笔误——浅一档就会与 c2 琥珀撞色，两两最小 ΔE 会从 44.45 掉到 16.01。
     轮换顺序、计数徽标与当前项的源顺序均未改动（AGENTS.md 锁定项）。 */
  --tag-c1: #ee0028;
  --tag-c2: #a26b00;
  --tag-c3: #008944;
  --tag-c4: #b12bff;
  --tag-c5: #4c3116;
  --tag-c6: #0077da;
}
```

**`.blogtags a`（第 3783–3793 行）**：

```css
.blogtags a,
.post-tags a {
  position: relative;
  display: inline-block;
  margin: 4px 5px 0 8px;
  padding: 3px 7px;
  background: var(--tag-c6);
  color: #fff !important;
  font-size: 11px;
  line-height: 14px;
}
```

（`::before` 三角 @3795–3806，`::after` 白点 @3808–3818，`nth-child(6n+1..5)` 背景 @3820–3859，`.tag-count` @3862–3866。）

**`.blogtags a.is-current`（第 3868–3875 行）**：

```css
/* 单标签页药丸云中的当前标签：品牌绿高亮（源顺序覆盖 nth-child 轮换色） */
.blogtags a.is-current {
  background: var(--colorful-green);
}

.blogtags a.is-current::before {
  border-right-color: var(--colorful-green);
}
```

**`.blogtags a.is-current` 必须保持在 nth-child 轮换规则之后**（同特异性靠源顺序覆盖）。
另有 `#sidebar .blogtags a:hover { text-decoration: none }` @5246–5248（挡掉「侧栏链接 hover 加下划线」那条通用规则）与 `.blogtags .tag-cloud-items` @5306–5310。

### 16n. 其它相关 token / 变量（实测）

- `.post-meta`（**生效版**，第 2640–2648 行附近）：`color: var(--colorful-text-secondary); font-size: 12px`，`span { margin-right: 10px; text-transform: uppercase }`（`@layer components` 内的旧版 @321–338 用 `var(--text-gray)`/`var(--line)`）
- `.post-lisence`（`@layer components`，第 499–507 行）：`border: 1px dashed var(--line); background: #f9f9f9; color: var(--colorful-text-secondary); font-size: 12px; line-height: 2`
- `.post-tags a` @516–522：`color: var(--primary)`，hover `text-decoration: underline`
- `.post-navigation-title` @3357（未展开规则体，实现子代理如无需要可忽略）

---

## 17. `src/utils/lqip-utils.ts` 与 `src/components/control/ResponsiveImage.astro`

### 17a. `src/utils/lqip-utils.ts`（全文 65 行）

```ts
// LQIP 模糊占位图查询工具（移植自 Firefly 的 src/utils/lqip-utils.ts，MIT）
// 方案来源: https://blog.cosine.ren/post/astro-lqip-implementation
//
// 从 @constants/lqips.json（由 scripts/generate-lqips.mjs 生成）查询图片的
// 三色渐变，返回内联 style；无数据或外部图片自动降级。

import lqipData from "@constants/lqips.json";

// 值为 { g: 18 字符紧凑渐变, bytes: 源图字节数（generate-lqips 变更检测用） }
const lqips: Record<string, { g: string; bytes: number }> = lqipData as Record<
	string,
	{ g: string; bytes: number }
>;

const DEFAULT_GRADIENT =
	"linear-gradient(135deg, #d6d3d1 0%, #a8a29e 50%, #d6d3d1 100%)";

/**
 * 将 LQIP 紧凑格式（18 字符 hex）解码为 CSS 线性渐变
 * 格式：6e3b38ae7472af7574 → linear-gradient(135deg, #6e3b38 0%, #ae7472 50%, #af7574 100%)
 */
export function getLqipGradient(src: string): string | undefined {
	// 相册等处会输出 encodeURIComponent 后的 URL，先还原成磁盘原始路径再查 key
	let decoded = src;
	try {
		decoded = decodeURIComponent(src);
	} catch {
		/* 含孤立 % 等非法序列时保持原值 */
	}
	let entry: { g: string; bytes: number } | undefined;
	if (decoded.startsWith("/")) {
		// public 图片：key 格式为 public:xxx（去掉开头的 /）
		entry = lqips[`public:${decoded.slice(1)}`];
	} else {
		// src 图片：key 格式为 src:xxx
		entry = lqips[`src:${decoded}`] || lqips[decoded];
	}
	const compact = entry?.g;
	if (compact?.length !== 18) return undefined;
	const c1 = `#${compact.slice(0, 6)}`;
	const c2 = `#${compact.slice(6, 12)}`;
	const c3 = `#${compact.slice(12, 18)}`;
	return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
}

/** 判断是否为外部图片 */
export function isExternalImage(src: string): boolean {
	return (
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("data:")
	);
}

/** 获取 LQIP props（用于 Astro 组件），外部图片自动降级为默认渐变 */
export function getLqipProps(src: string): { style: string } {
	if (isExternalImage(src))
		return { style: `background: ${DEFAULT_GRADIENT}` };
	const gradient = getLqipGradient(src);
	return {
		style: gradient
			? `background: ${gradient}`
			: `background: ${DEFAULT_GRADIENT}`,
	};
}
```

**用法（`[...slug].astro:110–124` 的真实范式）**：

```astro
<figure class="post-cover lqip-wrap">
	<div
		class="lqip-placeholder"
		style={getLqipProps(cover).style}
		aria-hidden="true"
	>
	</div>
	<ResponsiveImage src={cover} alt={title} title={title} loading="eager" sizes="…" />
</figure>
```

**`@constants` 别名**：`tsconfig.json:15` → `"@constants/*": ["src/constants/*"]`。`lqips.json` 键格式 `public:images/posts/<id>/<file>.jpg`（去掉前导 `/`），`src:` 前缀给 `src/` 下的图。

### 17b. `src/components/control/ResponsiveImage.astro`（全文 34 行）

```astro
---
// 响应式图片：<picture> + WebP source + 原图格式 srcset 兜底（TODO2）
// 属性由 image-variants.ts 从构建期 manifest 查询；无变体的图片自动降级为裸 <img>。
import { getResponsiveImage } from "../../utils/image-variants";

interface Props
	extends
		astroHTML.JSX.ImgHTMLAttributes,
		astroHTML.JSX.AstroBuiltinAttributes {
	/** 图片 URL（/images/... 形式） */
	src: string;
	/** sizes 提示（如 "(max-width: 680px) 100vw, 660px"） */
	sizes: string;
}

const { src, sizes, ...imgProps } = Astro.props;
const attrs = getResponsiveImage(src);
---

<picture>
	{
		attrs.webpSrcset && (
			<source type="image/webp" srcset={attrs.webpSrcset} sizes={sizes} />
		)
	}
	<img
		src={attrs.src}
		srcset={attrs.srcset}
		sizes={attrs.srcset ? sizes : undefined}
		width={attrs.width}
		height={attrs.height}
		{...imgProps}
	/>
</picture>
```

**props 名与用法**：
- **必填** `src`（`/images/...` 形式）、`sizes`（字符串，媒体查询提示）
- 其余透传为标准 `<img>` 属性（`extends ImgHTMLAttributes`）：`alt` / `title` / `loading` / `class` / `decoding` 等
- 输出 `<picture><source type="image/webp">…<img …></picture>`
- **无变体时自动降级为裸 `<img>`**（`source` 不渲染）
- **注意**：`ResponsiveImage` 自身**不画 LQIP**——LQIP 由外层 `figure.lqip-wrap + div.lqip-placeholder`（`style={getLqipProps(...).style}`）提供。总览卡若要 LQIP，需自行加这两层。

---

## 18. `scripts/generate-lqips.mjs`（352 行）

### 扫描根与常量（第 21–44 行）

```js
const SRC_DIR = "src";
const PUBLIC_DIR = "public";
const OUTPUT_FILE = "src/constants/lqips.json";
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
// 需要忽略的目录（相对于项目根目录，目录前缀匹配）
// public/images/_variants 是 WebP 变体目录（见下方变体生成），不参与 LQIP 扫描
const IGNORE_DIRS = [
	"src/content",
	"public/fonts",
	"public/pio",
	"public/friend-icons",
	"public/images/_variants",
];

// ---------- WebP 响应式变体 ----------
const IMAGES_ROOT = path.join(PUBLIC_DIR, "images");
const VARIANTS_ROOT = path.join(IMAGES_ROOT, "_variants");
const MANIFEST_FILE = "src/constants/image-manifest.json";
const VARIANT_WIDTHS = [480, 720, 1080, 1440];
// 变体档位相对原图需有足够缩放收益才生成（避免 860 宽原图生成 720 变体）
const VARIANT_SCALE_RATIO = 1.2;
// 背景图由 theme-script JS 加载，不属于四类渲染层，跳过（_variants 是变体自身目录）
const VARIANT_SKIP_DIRS = ["public/images/bg", "public/images/_variants"];
const VARIANT_SRC_EXTS = new Set([".jpg", ".jpeg", ".png"]);
```

- **扫描根 = `src` 与 `public` 递归**（`collectImages`，第 126–127 行调用）
- **`IGNORE_DIRS` = 第 27–33 行**（5 条；spec 说的四项 + `src/content` 共五项）
- **变体侧另跳** `VARIANT_SKIP_DIRS` = `public/images/bg` 与 `public/images/_variants`（第 43 行）
- **输出**：`OUTPUT_FILE = "src/constants/lqips.json"`（第 23 行）；`MANIFEST_FILE = "src/constants/image-manifest.json"`（第 38 行）
- **变体目录**：`public/images/_variants/<相对路径>.<W>w.webp`（第 37 / 314 行）

### 键生成（`filePathToKey`，第 81–86 行）

```js
function filePathToKey(filePath) {
	if (filePath.startsWith(PUBLIC_DIR)) {
		return `public:${path.relative(PUBLIC_DIR, filePath).replace(/\\/g, "/")}`;
	}
	return `src:${path.relative(SRC_DIR, filePath).replace(/\\/g, "/")}`;
}
```

### 写入逻辑

- **lqips.json**（第 194–200 行）：`fs.mkdir(dirname)` → `fs.writeFile(OUTPUT_FILE, await formatJson(OUTPUT_FILE, lqips), "utf-8")`；写入器是 `scripts/lib/write-json.mjs` 的 `formatJson`（第 19 行 import）
- **manifest**（第 340–345 行）：`fs.mkdir(dirname(MANIFEST_FILE))` → `fs.writeFile(MANIFEST_FILE, await formatJson(MANIFEST_FILE, manifest), "utf-8")`
- **增量**：按源图 `bytes`（第 146–172 行）或 `--refresh`；**删除已不存在的条目**（第 134–144 行）

### `src/constants/lqips.json` 顶层键形态（实测，914 行）

```
{
	"public:domain/img/001.png": {
		"g": "c73333c73333c93333",
		"bytes": 3089
	},
	"public:domain/img/002.png": {
		"g": "d3d2c8d4d3c6c5b89c",
		"bytes": 7661
	},
	…
	"public:images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg": {
		"g": "424959182030111622",
		"bytes": 65221
	},
	"public:images/posts/20260919135000/matt-pocock-workflow-cover.jpg": {
		"g": "1d1e213b312c666363",
		"bytes": 64460
	},
```

**形态**：`{"<scope>:<相对路径>": {"g": "<18 字符紧凑 hex>", "bytes": <number>}}`。**顶层键 = 文件路径**（含扩展名），值是 `{ g, bytes }`。

### `src/constants/image-manifest.json` 顶层键形态（实测，457 行）

```
{
	"public:images/albums/日常随手拍/20210405_004840940_iOS.jpg": {
		"width": 3264,
		"height": 2448,
		"variants": [480, 720, 1080, 1440]
	},
	"public:images/albums/日常随手拍/20210405_004950340_iOS.jpg": {
		"width": 3264,
		"height": 2448,
		"variants": [480, 720, 1080, 1440]
	},
	…
	"public:images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg": {
		"width": 1320,
		"height": 742,
		"variants": [480, 720, 1080]
	},
	"public:images/posts/20260919135000/matt-pocock-workflow-cover.jpg": {
		"width": 1320,
		"height": 743,
		"variants": [480, 720, 1080]
	},
```

**形态**：`{"public:images/<相对路径>": {"width": <n>, "height": <n>, "variants": [<W>…]}}`。**只有原图宽度 > 档位 × 1.2 才写条目**（第 301–311 行），所以两张 1320 宽的封面只有 `[480, 720, 1080]` 三档、**没有 1440**。

**对 `public/images/series/<slug>.<ext>` 的自动生效**：新目录不在 `IGNORE_DIRS` / `VARIANT_SKIP_DIRS` 内 → 自动获得 LQIP 条目与 ≤1440 的四档变体。**但必须 `pnpm build`（或单独跑 `node scripts/generate-lqips.mjs`）重新生成这两个 JSON，产物才会多出条目。**

---

## 19. `scripts/lib/smoke-harness.mjs`（全文 155 行）

```js
// 冒烟测试台（缝隙 A 与其三套同族脚本共用的台子）。
//
// 为什么存在：check() 此前有四份实现、外加两份 QA 脚本共六种方言，其中
// nice-books-geometry-qa.mjs 的签名是 check(ok, message)——与其余的
// check(name, ok, detail) **参数顺序相反**，把一行判据从一套 smoke 复制到另一套
// 会静默错位（ok 收到一个非空字符串，于是永远 PASS）。console 采集、「外部服务
// 不计 FAIL」的判定、汇总与退出码也各写一遍，且已经漂了：同一个
// NICE_BOOKS_BASE_URL 有三处不同默认值。
//
// 台子只管台子的事：登记判据、采集报错、汇总退出。**判据本身、导航、像素比对
// 助手都留在各 smoke 里**，且刻意不反转控制——各脚本仍是自己 launch、自己导航、
// 自己关浏览器的线性脚本，迁移只是把重复实现换成 import。
//
// 启动参数默认 headless。注意：涉及滚动条宽度、position:fixed 包含块、
// `scrollbar-gutter` 一类的判据必须在真实浏览器里量——headless Chromium 走
// overlay 滚动条（innerWidth === clientWidth），会把这类缺陷整个量成 0。
// 那种场合由调用点传 { headless: false, channel: "msedge" }。
import { chromium } from "playwright";

/**
 * @param {object}   options
 * @param {string}   options.envVar      该套 smoke 的 base URL 环境变量名
 * @param {string}   options.defaultBase 未设环境变量时的默认值（各点自述，台子不统一端口）
 * @param {(info: {url: string, text: string, base: string}) => boolean} [options.isNoise]
 *                「这条报错不该算失败」的策略。台子不预设清单——放行名单是缺陷的藏身处，
 *                每一条都必须写在调用点上、可被读到。
 * @param {object}   [options.launch]    chromium.launch() 的注入参数
 */
export function makeHarness({
	envVar,
	defaultBase,
	isNoise = () => false,
	launch = {},
}) {
	const base = process.env[envVar] ?? defaultBase;
	// 形态回显：AGENTS.md 记过三次踩坑——FANCY_BASE_URL 要站点根，
	// NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 要完整页面地址，传错表现为「选择器等不到」的假失败。
	// 判形看 pathname，不看结尾斜杠：站点根写成 `https://x/` 时结尾也有斜杠，
	// 而它传给「自己拼 /posts/...」的脚本就会造出 `//posts/...`——
	// 浏览器按**协议相对 URL** 解析它（host 变成 `posts`），于是一整段的
	// `Failed to construct 'URL': Invalid URL` 与 replaceState 拒绝全是脚手架自己造的，
	// 2026-09-25 就是这样把一次线上复跑读成 20 项红。
	let shape;
	try {
		const path = new URL(base).pathname;
		shape =
			path === "/" || path === ""
				? "站点根"
				: `完整页面/目录地址（${path}）`;
	} catch {
		shape = "无法解析的 URL";
	}
	console.log(`[smoke] ${envVar}=${base}（形态：${shape}）`);
	if (shape.startsWith("站点根") && /\/$/.test(base)) {
		console.log(
			`[smoke] 注意：${envVar} 以 / 结尾且是站点根——脚本内 base + "/path" 会拼出 //path（协议相对 URL），请去掉结尾斜杠`,
		);
	}

	const results = [];

	/**
	 * 登记一条判据。`extra` 是为 `nice-books-design-qa.mjs` 那类需要附结构化数据的
	 * 形状预留的槽位（票 06 实测其形状为 `check(name, ok, detail, extra = {})`）：
	 * 台子只把它原样挂在结果行上，**不展开进结果对象、也不返回布尔**——真去迁那两套
	 * QA 脚本时要先补这两点，槽位本身不等于契约。现在只有一个消费者用不到，故不提前加宽。
	 */
	function check(name, ok, detail = "", extra = undefined) {
		results.push({ name, ok, extra });
		console.log(
			`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
		);
	}

	/**
	 * 一个报错汇：attach(page) 之后该页的 pageerror / console.error 按策略过滤后入列。
	 * 多页面场景（如离线快照另开一页）可另建一个汇，各自带更严或更宽的噪声策略；
	 * 每个汇自带 checkClean 游标，互不吞报错。
	 */
	function createSink({ name = "main", sinkNoise = null } = {}) {
		const errors = [];
		const noise = sinkNoise ?? isNoise;
		// 游标按汇各存一份：若所有汇共用一个整数，A 汇先收 5 条、再查 B 汇时，
		// B 的前 5 条会被当成「上一段已报过」而漏掉。
		let seen = 0;
		function attach(page) {
			page.on("pageerror", (e) => {
				const message = String(e.message ?? e);
				if (noise({ url: "", text: message, base })) return;
				errors.push(message.slice(0, 140));
			});
			page.on("console", (m) => {
				if (m.type() !== "error") return;
				const text = m.text();
				const url = m.location()?.url || "";
				if (noise({ url, text, base })) return;
				errors.push(
					`${text.slice(0, 90)} @ ${url.slice(base.length) || "?"}`,
				);
			});
			return page;
		}
		/**
		 * 按票归属：全程只在最后报一次会把前面某票的报错算到最后一票头上。
		 * 只报这一段新出现的报错，报完把游标推到自己列表末尾。
		 */
		function checkClean(label) {
			const fresh = errors.slice(seen);
			seen = errors.length;
			check(
				`${label}：无本地 console / page 报错`,
				fresh.length === 0,
				fresh.slice(0, 2).join(" | "),
			);
		}
		return { name, errors, attach, checkClean };
	}

	const mainSink = createSink();

	/** 默认查主汇；多页面场景传第二个参数查对应汇（游标各走各的） */
	function checkClean(label, sink = mainSink) {
		sink.checkClean(label);
	}

	function summary() {
		const failed = results.filter((r) => !r.ok);
		return { total: results.length, failed, ok: failed.length === 0 };
	}

	/**
	 * 四套 smoke 共同的汇总口径：只按判据成败决定退出码——
	 * 报错是否算失败由各 smoke 自己的 checkClean 判据决定，这里不重复计。
	 */
	function finish() {
		const { total, failed } = summary();
		console.log(`\n合计 ${total} 项，失败 ${failed.length} 项`);
		if (failed.length) failed.forEach((f) => console.log("  -", f.name));
		process.exit(failed.length ? 1 : 0);
	}

	return {
		base,
		launch,
		browser: chromium,
		check,
		checkClean,
		createSink,
		sink: mainSink,
		errors: mainSink.errors,
		attach: mainSink.attach,
		summary,
		finish,
	};
}
```

### 语义说明

| 名字 | 签名 / 语义 | 行号 |
| --- | --- | --- |
| `makeHarness` | `({ envVar, defaultBase, isNoise = () => false, launch = {} })` → 台子对象 | 29–34 |
| `base` | `process.env[envVar] ?? defaultBase`（第 35 行）；同时打印「形态」回显 | 35 |
| `check` | `check(name: string, ok: boolean, detail = "", extra = undefined)`；推入结果行并打印 `PASS/FAIL name :: detail` | 68–73 |
| `checkClean` | 顶层：`checkClean(label: string, sink = mainSink)` → 委托 `sink.checkClean`；汇内：只报 `errors.slice(seen)` 之后新出现的报错，游标推进到末尾，**报一次失败判据** | 107–124 |
| `finish` | `finish()`：打印「合计 N 项，失败 M 项」+ 失败名单，`process.exit(failed.length ? 1 : 0)` | 135–140 |
| `launch` | 从 options 透传的 `chromium.launch()` 参数（如 `{ headless: false, channel: "msedge" }`），返回对象里原样给调用点用 | 33 / 144 |
| `isNoise` | `({ url, text, base }) => boolean`；`true` = 该条报错不算失败。**台子不预设任何放行名单** | 24–26 / 32 |
| `envVar` | 环境变量名；`base` 由它读取 | 22 / 35 |
| `defaultBase` | 未设环境变量时的默认值 | 23 / 35 |
| 返回对象 | `{ base, launch, browser: chromium, check, checkClean, createSink, sink, errors, attach, summary, finish }` | 142–154 |

### 真实调用点 —— `scripts/fancybox-smoke.mjs`

**头 60 行（1–60）**：

```js
// 灯箱（Fancybox）实机烟测
// 前置：pnpm build && pnpm preview --port 4322
// 运行：pnpm test:fancybox（或 FANCY_BASE_URL=http://localhost:4321 node scripts/fancybox-smoke.mjs）
// 覆盖：关闭不跳位、焦点归还、定位到文章位置（含 reduced-motion）、下载新标签页、中文文案
// 台子（check / 报错采集 / 汇总）来自 scripts/lib/smoke-harness.mjs，本文件只写判据。
// FANCY_BASE_URL 传的是**站点根**（脚本自己拼 /posts/... 与 /albums/...），
// 与 NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 那种「完整页面地址」形态不同。
import { makeHarness } from "./lib/smoke-harness.mjs";

// 外部服务（Giscus 评论接口、字体 CDN）在本机网络下可能 4xx/重置：单列统计，不计 FAIL；
// 本地资源的失败仍然严格判失败。策略写在调用点，台子内不放行任何东西。
const externalIssues = [];
const harness = makeHarness({
	envVar: "FANCY_BASE_URL",
	defaultBase: "http://localhost:4322",
	isNoise: ({ url, base }) => {
		if (!url || url.startsWith(base)) return false;
		externalIssues.push(url.split("/")[2]);
		return true;
	},
});
const base = harness.base;
const { check } = harness;
const articlePath = "/posts/20260909092113/";
const albumPath = "/albums/" + encodeURIComponent("轻松一刻") + "/";

/** 灯箱打开期间的工具栏快照：右上角按钮顺序与文案 */
const toolbarState = () => {
	const c = document.querySelector(".fancybox__container");
	if (!c) return null;
	const right = c.querySelector(
		".f-carousel__toolbar__column.is-right, .f-toolbar__column.is-right",
	);
	return {
		buttons: [...(right?.querySelectorAll("button") || [])].map((b) => ({
			title:
				b.getAttribute("title") || b.getAttribute("aria-label") || "",
			locate: b.matches("[data-fancybox-locate]"),
			download: b.matches("[data-carousel-download]"),
		})),
		titles: [...c.querySelectorAll("[title]")].map((e) =>
			e.getAttribute("title"),
		),
	};
};

/** 等待关闭动画结束（容器被移出 DOM） */
async function waitClosed(page) {
	await page
		.waitForFunction(
			() => !document.querySelector(".fancybox__container"),
			null,
			{
				timeout: 10000,
			},
		)
		.catch(() => {});
	await page.waitForTimeout(600);
}
```

**尾 20 行（435–455）**：

```js
);

check(
	"全程无本地资源请求失败",
	failedRequests.length === 0,
	failedRequests.join(" | "),
);
check(
	"全程无 console/page 报错",
	harness.errors.length === 0,
	harness.errors.slice(0, 3).join(" | "),
);
if (externalIssues.length)
	console.log(
		`NOTE  外部服务请求问题（不计失败）: ${[...new Set(externalIssues)].join(", ")}`,
	);

await browser.close();

harness.finish();
```

**标准写法总结（`scripts/series-smoke.mjs` 照抄）**：
1. 头注释写前置（`pnpm build && pnpm preview --port 4322`）与 URL 形态（`SERIES_BASE_URL` 建议传**站点根**，脚本自己拼 `/posts/...`、`/series/...`）
2. `const harness = makeHarness({ envVar: "SERIES_BASE_URL", defaultBase: "http://localhost:4322", isNoise: ({url, base}) => … })`
3. `const base = harness.base; const { check } = harness;`
4. 自己 `const browser = await harness.browser.launch(harness.launch)` / `page = await browser.newPage()` / `harness.attach(page)`
5. 逐条 `check("判据名", 布尔, "细节")`
6. `await browser.close(); harness.finish();`

**注意**：`fancybox-smoke.mjs` 用的是 `harness.errors.length` 直接读主汇的报错数（另外一条等价于 `checkClean` 的手写判据）；`harness.launch` 是给 `chromium.launch()` 的参数；`harness.browser` 就是 `playwright` 的 `chromium`。`ui-smoke.mjs`（3654 行）用的是同一台子，判据 121 项——spec 明确**不得**往它里面加判据。

---

## 20. `src/data/` 与 TS 模块体例

### 目录全部文件（12 个，`ls -la` 实测）

```
comments.ts          2650 B
diary.ts             2733 B
friends.json         1666 B
friends.ts            295 B
giscus-sync.json      112 B
guestbook.ts         1605 B
projects.test.ts     1699 B
projects.ts          4841 B
site-stats.json       483 B
skills.ts           11710 B
timeline.ts          3022 B
```

（`friends.json` / `giscus-sync.json` / `site-stats.json` 是 JSON；其余是 TS。`projects.test.ts` 是 `src/data` 下唯一的测试文件，但 `pnpm test:utils` 的扫描范围是 `src/utils/*.test.ts`——见 spec 第 93 行的说法，`src/data/projects.test.ts` 由 `pnpm test:projects` 跑。）

### TS 模块体例样板 —— `src/data/timeline.ts` 头 40 行

```ts
// Timeline data configuration file
// Used to manage data for the timeline page

export interface TimelineItem {
	id: string;
	title: string;
	description: string;
	type: "education" | "work" | "project" | "achievement";
	startDate: string;
	endDate?: string; // If empty, it means current
	location?: string;
	organization?: string;
	position?: string;
	skills?: string[];
	achievements?: string[];
	links?: {
		name: string;
		url: string;
		type: "website" | "certificate" | "project" | "other";
	}[];
	icon?: string; // Iconify icon name
	color?: string;
	featured?: boolean;
}

export const timelineData: TimelineItem[] = [
	{
		id: "current-study",
		title: "本科学习中",
		description: "正努力学习专业知识，随导师研读论文中。",
		type: "education",
		startDate: "2024-09-01",
		location: "江西",
		organization: "江西财经大学，信息管理与数学学院",
		skills: ["C++", "Java", "Python", "Data Structures", "Algorithms"],
		achievements: ["S5战场统帅（不是"],
		icon: "material-symbols:school",
		color: "#0fa365",
		featured: true,
	},
```

### TS 模块体例样板 —— `src/data/projects.ts` 头 40 行

```ts
// /projects/ 的人工策展层：公开仓库基础信息来自构建期 GitHub 快照，
// 本文件只保留需要覆盖的展示字段和无法公开读取的私有项目。

import githubProjects from "../constants/github-projects.json" with { type: "json" };
import {
	resolveProjects,
	type GitHubProjectsSnapshot,
	type ManualProject,
	type ProjectOverride,
} from "../utils/projects";

const projectOverrides: Record<string, ProjectOverride> = {
	"CaiYan12/windy-project-mgr": {
		id: "windy-project-mgr",
		title: "Windy Project Manager",
		description:
			"Windows 本地优先的项目管理与信息聚合工具：卡片式展示项目、技术栈与 Git 状态，支持 Open / Run / Build 操作，MVP 已完成验收。",
		category: "desktop",
		techStack: ["Tauri", "Rust", "React", "TypeScript"],
		status: "completed",
		startDate: "2026-08-27",
		featured: true,
	},
	"CaiYan12/opia-rss-reader": {
		id: "opia-rss-reader",
		title: "Opia RSS Reader",
		description:
			"Windows 桌面 AI 新闻 RSS 阅读器，默认订阅橘鸦AI早报；支持多源标签页、主题编辑器、Mini 挂件模式与插件扩展。",
		category: "desktop",
		techStack: ["Electron", "React", "TypeScript", "Tailwind CSS"],
		status: "in-progress",
		startDate: "2026-08-19",
		featured: true,
	},
	"CaiYan12/WindyPics": {
		id: "windypics",
		title: "WindyPics",
		description: "一个轻量的本地图片查看器，基于 Qt 6.8 + C++17。",
		category: "desktop",
		techStack: ["Qt 6", "C++17"],
```

**`src/data/series.ts` 体例建议**（照 `timeline.ts`）：顶部写文件头注释 → `export interface SeriesItem { … }`（`slug` / `name` / `description` / `cover?` / `unit?`）→ `export const seriesList: SeriesItem[] = [ … ]`。**不要** import 任何 `astro:content` 或 `@constants`；`resolveSeriesMeta` 从 `content-utils.ts` import `seriesList`（或由调用侧传入，见 spec 第 115 行）。

---

## 21. 六篇待回填文章的 frontmatter（逐字）

> 以下均为文件**第 1 行 `---` 起的完整 frontmatter**（含结束行 `---`）。4 篇本书的第 6 行都是 `tags: [AI编程, Vibe Coding, 看懂AI写的网站]`。

### 21a. `src/content/posts/20261002071103/index.md`（第〇章）

```yaml
---
title: "《看懂 AI 写的网站》第〇章：开始之前——先建立现代 Web 的全局地图"
published: 2026-10-02 07:11:03
description: "《看懂 AI 写的网站：现代 Web 开发从底层到部署》全书导论：这本书训练的是判断力而不是动手能力——给出两种读法、「六问法则」与「AI 黑话翻译」两个体例，以及 L0–L12 十三层技术栈全景图与两对核心区分（源码/构建产物、开发/生产环境）。"
image: /images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg
tags: [AI编程, Vibe Coding, 看懂AI写的网站]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg`（**无引号**）
- `tags` 是**行内数组 `[...]`**（不是 YAML 多行 `- ` 形式）
- `published` 是**未加引号的 `YYYY-MM-DD HH:mm:ss`**（Astro 的 glob loader 解析成 `z.date()`）
- frontmatter 共 12 行（第 1 行 `---` 到第 13 行 `---`）

### 21b. `src/content/posts/20261002081331/index.md`（第一章）

```yaml
---
title: "《看懂 AI 写的网站》第一章：L0 基础环境——Web 运行在什么之上"
published: 2026-10-02 08:13:31
description: "《看懂 AI 写的网站：现代 Web 开发从底层到部署》第一章。L0 基础环境是网页得以运行的地方——操作系统、命令行、浏览器与网络四样东西。读完你应能判断「'node' 不是内部或外部命令」「端口被占用」「404」这类报错属于哪一侧，以及 AI 说「换个端口」「试试 127.0.0.1」时它在动什么。"
image: /images/posts/20261002081331/webapp-vibe-coding-ch1-cover.jpg
tags: [AI编程, Vibe Coding, 看懂AI写的网站]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20261002081331/webapp-vibe-coding-ch1-cover.jpg`

### 21c. `src/content/posts/20261002093931/index.md`（第二章）

```yaml
---
title: "《看懂 AI 写的网站》第二章：L1 Web 基础——浏览器如何构成一个网页"
published: 2026-10-02 09:39:31
description: "《看懂 AI 写的网站：现代 Web 开发从底层到部署》第二章。L1 是浏览器直接认识的一层：HTML 描述结构、CSS 描述外观，浏览器把它们变成 DOM 与渲染树再画出画面。读完你应能看懂「规则被更高优先级压住」「父元素设成 display: flex」「外边距折叠」「不在渲染树里」这些话在说浏览器的哪一部分。"
image: /images/posts/20261002093931/webapp-vibe-coding-ch2-cover.jpg
tags: [AI编程, Vibe Coding, 看懂AI写的网站]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20261002093931/webapp-vibe-coding-ch2-cover.jpg`

### 21d. `src/content/posts/20261002204249/index.md`（第三章）

```yaml
---
title: "《看懂 AI 写的网站》第三章：L2 JavaScript——网页为什么能够交互"
published: 2026-10-02 20:42:49
description: "《看懂 AI 写的网站：现代 Web 开发从底层到部署》第三章。L2 是「页面的行为」层：JavaScript 让页面对操作做出反应。这一章讲语言本身、DOM 与事件、模块/异步/网络请求，以及 AI 输出里最常见的几类报错——目标是看懂 AI 写的那几行，而不是学会写。"
image: /images/posts/20261002204249/webapp-vibe-coding-ch3-cover.jpg
tags: [AI编程, Vibe Coding, 看懂AI写的网站]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20261002204249/webapp-vibe-coding-ch3-cover.jpg`

### 21e. `src/content/posts/20260919135000/index.md`（Matt Pocock 工作流，`matt-pocock` 序号 0）

```yaml
---
title: "Matt Pocock 工作流在实际 Vibe Coding 中的应用"
published: 2026-09-19 13:50:00
readingTime: 7
description: "照 Matt Pocock 官方视频梳理的 skills 工作流使用顺序：/setup-matt-pocock-skills 一次性初始化，/grill-with-docs 把模糊想法同步成共识，再按任务能否塞进一个高效上下文窗口分岔——能就直达 /implement，不能走 /to-spec → /to-tickets 按 400K 阈值切分计划，最后 /code-review 放进干净上下文的子代理里做双轴审查。"
image: /images/posts/20260919135000/matt-pocock-workflow-cover.jpg
tags: [AI编程, Claude Code, Vibe Coding, 工作流]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20260919135000/matt-pocock-workflow-cover.jpg`
- **多一个字段 `readingTime: 7`**（在 `published` 之后、`description` 之前）
- `tags` 里有 `Vibe Coding`（与本书四章共有）

### 21f. `src/content/posts/20261006110122/index.md`（Matt Pocock Skills v1.3，`matt-pocock` 序号 1）

```yaml
---
title: "Matt Pocock Skills v1.3 给大任务加了一条实现路线"
published: 2026-10-06 11:01:22
description: "拆完 spec 和 tickets 以后怎么推进？v1.3 让 /implement-spec 转正，同期毕业的 /pr、/retro 和一次文件改名也值得一看。"
image: /images/posts/20261006110122/matt-pocock-skills-v13-youtube-cover.jpg
tags: [AI编程, Claude Code, 工作流]
category: 技术
draft: false
private: false
views: 0
comments: 0
hotness: 0
---
```

- `image` = `/images/posts/20261006110122/matt-pocock-skills-v13-youtube-cover.jpg`（**注意文件名是 `matt-pocock-skills-v13-youtube-cover.jpg`，不是 spec 里说的 `matt-pocock-workflow-cover.jpg`；后者的实际落点是 `20260919135000` 那篇**）
- frontmatter 共 13 行（到第 13 行 `---`）

### 21g. 非成员样本 —— `src/content/posts/20260728000000/index.md`（置顶那篇）

```yaml
---
title: 你好，Astro！博客迁移正式完成
published: 2026-07-28
readingTime: 2
category: 技术
tags: [Astro, 博客, 迁移]
description: 从 Emlog Colorful 主题迁移到 Astro 静态博客的完整记录
pinned: true
views: 328
comments: 12
hotness: 4
private: true
---
```

- **`title` / `description` 无引号**（含 `！` 也不加引号——`title: 你好，Astro！博客迁移正式完成`）
- `published: 2026-07-28`（**只有日期，无时分秒**）
- **`pinned: true` 与 `private: true` 同时存在**（← 见 §与 spec 的出入 第 1 条）
- 字段顺序与其它文章不同（`category` 在 `tags` 之前，无 `image`）
- **无 `image` 字段** → 作为非成员样本，其 `getCover()` 会落到 `/images/random/tb{n}.jpg`

---

## 22. 封面回退要用的两张图（`ls -l` 实测，均存在）

```
$ ls -l public/images/posts/20261002071103/
total 64
-rw-r--r-- 1 Einn Tzai 197609 65221 Oct  2 08:39 webapp-vibe-coding-ch0-cover.jpg

$ ls -l public/images/posts/20260919135000/
total 64
-rw-r--r-- 1 Einn Tzai 197609 64460 Sep 19 14:01 matt-pocock-workflow-cover.jpg
```

| 路径 | 存在 | 大小 |
| --- | --- | --- |
| `public/images/posts/20261002071103/webapp-vibe-coding-ch0-cover.jpg` | ✅ | 65,221 B |
| `public/images/posts/20260919135000/matt-pocock-workflow-cover.jpg` | ✅ | 64,460 B |

两个目录**各自只有一个文件**（无其它封面候选），spec 里的路径**完全正确**。
两张图在 JSON 里的现状：`lqips.json` 有 `{ g: "424959182030111622", bytes: 65221 }` 与 `{ g: "1d1e213b312c666363", bytes: 64460 }`；`image-manifest.json` 有 `1320×742 variants [480,720,1080]` 与 `1320×743 variants [480,720,1080]`。

---

## 23. `public/images/` 一级子目录 / 条目清单（`ls public/images/` 实测）

**目录**（一级）：`_variants`、`about`、`albums`、`bg`、`diary`、`face`、`posts`、`random`、`slide`
**文件**（一级，节选，共 60 余个）：`001.gif` … `404.gif`、`admin.png`、`avatar.png`、`avatar.webp`、`banner.jpg`、`guide-cover.png`、`qq-qrcode.jpg`、`wechat-qrcode.jpg`、`timeline.png` 等。

**重要结论**：`public/images/` 下**当前没有 `series/` 目录**。spec 规划的 `public/images/series/<slug>.<ext>` 是要新建的目录（本次两本文集都不写 `cover`，所以**本次不需要建它**；只有票 07 的「红证据」环节临时用它）。

---

## 与 spec 的出入

> 以下只记录「spec 的描述 / 原文」与「实测证据」的差异，**不修正任何东西**。

### 出入 1（重要）：spec 排序表里的「位次 0」文章其实是 `private: true`，不会出现在 `getSortedPosts()` 的结果里

- **spec 说**（spec 第 36–46 行的 Problem Statement，第 38 行）：表格标题「实测当前公开文章的排序头部」，第 40 行列为
  > `| 0    | 20260728000000 你好，Astro！博客迁移正式完成（pinned: true）  |`
  以及第 51 行：
  > `3. 同一篇的右按钮指向 7 月 28 日那篇置顶文章——置顶把链头挪到了 2026-07-28。这第三处与文集无关，但同属这条时间线造成的副作用。`
- **实测 Y**：
  - `src/content/posts/20260728000000/index.md` 第 12 行是 `private: true`（第 8 行 `pinned: true`，**两者同时存在**）
  - `src/utils/content-utils.ts:14`：`getSortedPosts` 的第一件事是 `.filter(isPublicPost)`
  - `src/utils/content-utils.ts:8–10`：`isPublicPost` = `!post.data.draft && !post.data.private`
  - ⇒ `20260728000000` 被 `getSortedPosts()` **整个排除**，既不在「位次 0」，也不可能是 Matt 那篇（`20261006110122`）的 `next`。
- **影响面**：spec 的「三处错位」中**第 3 处（右按钮指向 7 月 28 日那篇）在当前代码下不成立**；票册 09 里用 `20260728000000` 作为「非成员文章页不出现任何文集 UI」的冒烟样本**仍然可用**（它确实有页面——`getStaticPaths` 只过滤 `draft`），但它**本来就不会出现在任何左右按钮链上**。实现子代理若按 spec 的表格去构造「当前排序」的断言，会与实测不符。

### 出入 2：`.post-metaa` / `.post-context` 的「约 :462 / 约 :452」只描述了 `@layer components` 里的那一份，真正生效的是更靠后的无层规则

- **spec 说**（第 31 行）：
  > `.post-metaa`（12px / `var(--text-light)` / `1px dotted var(--line)` 下边框，约 `:462-476`）
  > `.post-context`（纯文字行，`padding-top:10px; line-height:1.8`，约 `:452-455`）
- **实测 Y**：
  - 行号本身**准确**（组件层 `.post-context` = 452–455，`.post-metaa` = 462–470，`.post-metaa a` = 471–473，`:hover` = 474–476）
  - 但源顺序更靠后的无层规则**覆盖**了它们：`.post-context` 生效版在 **3110–3117**（`margin-top: 3px; padding: 0; line-height: 24px; word-break: break-all`）；`.post-metaa` 生效版在 **2931–2940**（`margin-top: -8px; border-bottom: 1px dotted var(--colorful-line); color: var(--colorful-text-secondary)`），`:hover` 在 **2947–2950**（`color: var(--colorful-green)`）。
  - 底层原因：`AGENTS.md:302` 明确「产物里根本不存在 `@layer`，冲突一律按特异性 → 源顺序判定」，两组选择器**特异性相同**，源顺序靠后者赢。
- **影响面**：spec 拟用的「两行提示取 `.post-metaa` 的 12px + `var(--text-light)` + hover `var(--primary)`」**结论仍然成立**（`var(--text-light)` = `var(--colorful-text-secondary)` = `#666`；`var(--primary)` = `var(--colorful-green)` = `#00c000`，与生效版 `:hover` 的 `var(--colorful-green)` 同值）。但如果实现子代理去「读 `.post-metaa` 的规则」时只读到 462–470，会拿到 `var(--line)` 而不是生效的 `var(--colorful-line)`（**同值 `#ddd`**），并漏掉 `margin-top: -8px`。**取值一致，别按层语义推理。**

### 出入 3：`.post-context` 的 `padding-top:10px; line-height:1.8` 不是生效值

- **spec 说**（第 31 行）：`.post-context`（纯文字行，`padding-top:10px; line-height:1.8`）
- **实测 Y**：生效版 `global.css:3110–3117` 是 `padding: 0; line-height: 24px; margin-top: 3px; font-size: inherit; word-break: break-all`。`padding-top:10px / line-height:1.8` 只在组件层（452–455）存在，**被覆盖**。（同出入 2 的机制。）

### 出入 4（重要）：`.post-thumbnail` 实际是 160×120（外框 168×128），不是 spec/AGENTS 反复引用的 150×90

- **spec 说**（第 24 行「总览页横向卡」复用资产表、第 30 行边界事实、第 162 行总览页说明）：
  > `PostCard`（`.post-list` + `.post-thumbnail` 150×90 左浮图，**唯一「左图右文」**）
  > 加一条 modifier 把左浮封面放到 240×135
  （`AGENTS.md:252` 与 `.workbuddy-ai/memory/MEMORY.md` 也写「`.post-thumbnail` 150×90」）
- **实测 Y**：
  - `@layer components` 内第 344–355 行确实是 `float: left; width: 150px` + `img { width: 150px; height: 90px }`
  - 但**生效版是无层第 2654–2676 行**：`.post-thumbnail { float: left; box-sizing: content-box; width: 160px; height: 120px; padding: 3px; border: 1px solid #e6e6e6 }` + `img { width: 160px; height: 120px; object-fit: cover; border-radius: 3px }`
  - 即**图片盒 160×120**，算上 `padding:3px` 与 `border:1px`（content-box）**外框 168×128**
  - 窄屏另有：`@media (max-width: 680px)`（5021–5028）仍是 160×120；`@media (max-width: 360px)`（5682–5689）降到 120×90
- **影响面**：总览卡要「加一条 modifier 把 150×90 放到 240×135」这个说法里的**基准值 150×90 与现状不符**；实现子代理应按 **160×120（图）/ 168×128（外框）→ 240×135** 设计 modifier，并注意 `.post-thumbnail` 带 `padding:3px + border:1px`（`box-sizing: content-box`），改尺寸时四值需同步。

### 出入 5：`.goon` 在 ≤680px 被 `display: none !important`

- **spec 说**（第 162 行）：总览页卡片的底部用 `.goon` 的「继续阅读 »」改为「进入目录 »」。
- **实测 Y**：`global.css:4901` 起的 `@media screen and (max-width: 680px)` 块内，**第 4913 行** `.goon` 在 `display: none !important` 的名单里（同名单还有 `#sidebar`、`.post-list::after`、`.post-navigation`、`.post-metaa .tools` 等，第 4906–4920 行）。
  ⇒ 窄屏总览卡的「进入目录 »」会**整块消失**。spec 未提及这一后果（spec 只提到「≤680px 封面降到 150×84」）。

### 出入 6：`#sidebar` 在 ≤768px 被 `display: none !important`（spec 的说法正确，但比 spec 更早的 `@media (max-width: 680px)` 还有一份重复）

- **spec 说**（第 153 行）：`#sidebar` 在 ≤768px 只是 `display:none`（节点仍在 DOM）。
- **实测 Y**：`global.css:4888–4899` 的 `@media screen and (max-width: 768px)` 内 `.post-header`（无）、`#sidebar, #head-nav .m-nav { display: none !important }`（第 4889–4892 行）——**准确**；另有 `@media screen and (max-width: 680px)`（4901 起）第 4908 行**再次**把 `#sidebar` 列入 `display: none !important`。两处同向，不矛盾。

### 出入 7：spec 说 `.post-navigation` 是「左右按钮」——实际生效版是 `position: fixed` 的视口侧边悬浮箭头

- **spec 说**（第 36 行、第 119–120 行）：多次以「左右按钮」指称 `.post-navigation` 的 prev/next。
- **实测 Y**：`@layer components` 内的旧版（542–571）是普通左右浮动块（`max-width: 48%`），**不生效**；生效版 `global.css:3258–3271` 是
  ```css
  .post-navigation a {
    position: fixed;
    bottom: 20%;
    z-index: 1000;
    …width: 100px; height: 100px; …
  }
  ```
  配合 `a.prev { left: 0 }` / `a.next { right: 0 }` —— 是**固定在视口左右边缘的 100×100 悬浮箭头**，且 `z-index: 1000` 是 `AGENTS.md:417` 层叠契约表里的既定值。
  ⇒ 「边界不渲染按钮」的可见效果 = **该侧的悬浮箭头整块不出现**（这恰好与 spec 第 141 行的「条件渲染天然满足」一致），但实现子代理在冒烟断言时不要去找「左右并排的按钮」，应查 `.post-navigation a.prev` / `a.next` 是否存在。**窄屏（≤680px）`display: none !important`（4915 行）。**

### 出入 8：spec 对 `20261006110122` 的封面文件名描述与实际不符（其一）

- **spec 说**（第 201 行）：「Matt 系列取 `matt-pocock-workflow-cover.jpg`（六篇成员都设了 `image`，已逐一核实）」
- **实测 Y**：`matt-pocock-workflow-cover.jpg` 的落点是 **`20260919135000`** 那篇；`20261006110122` 的 `image` 是 `/images/posts/20261006110122/matt-pocock-skills-v13-youtube-cover.jpg`（另一张）。
- **影响面**：Matt 文集按 `seriesOrder` 升序取「第一篇带 `image`」的成员 = `20260919135000`（序号 0）→ 结果**仍是** `matt-pocock-workflow-cover.jpg`，**最终结论与 spec 一致**。仅「六篇成员都设了 `image`」这句里的文件名归属需按上表核对。

### 出入 9：spec 第 93 行说「`src/utils/*.test.ts` 是 `pnpm test:utils` 的扫描范围」——`src/data/projects.test.ts` 在 `src/data/` 下，不由 `test:utils` 跑

- **spec 说**（第 93 行）：抽 `postsSchema` 到 `src/utils/posts-schema.ts` 的理由是「`src/utils/*.test.ts` 是 `pnpm test:utils` 的扫描范围」。
- **实测 Y**：`src/utils/` 下现有 `content-utils.test.ts` 与 `pagination.test.ts`（`ls` 实测），另有 `src/data/projects.test.ts`（在 `src/data/`，由 `pnpm test:projects` 跑，见 `AGENTS.md:262`）。spec 的表述**与方法一致**（新的 `posts-schema.test.ts` / `series-integrity.test.ts` 放 `src/utils/` 就能进 `test:utils`），仅 `src/data/projects.test.ts` 是同类但不在此范围。

### 出入 10：spec 说 `.post-metaa` 的下边框是 `1px dotted var(--line)`——生效值是 `var(--colorful-line)`

- **spec 说**（第 31 行、第 144 行）：`.post-metaa` 下边框 `1px dotted var(--line)`。
- **实测 Y**：生效版（2931–2940）用 `var(--colorful-line)`（= `#ddd`，1722 行），组件层（466 行）用 `var(--line)`（= `#ddd`，23 行）。**两者同值**，视觉无差；但「不带下边框」的理由链里引用的 token 名与实际生效规则不同源。**不是缺陷，只是 token 名不一致。**

### 出入 11（供参考，非矛盾）：spec 说站内 `fa-list-ol` 等「`src/` 零占用」——实测成立

- spec 第 32 行说 `fa-list-ol` / `fa-book` / `fa-sitemap` / `fa-indent` / `fa-th-list` 已实测存在且 `src/` 零占用；`fa-book-open` / `fa-clone` / `fa-layer-group` / `fa-stream` 不存在。
- **实测 Y（复核）**：`src/styles/font-awesome.css` 中 `.fa-list-ol:before` / `.fa-book:before` / `.fa-sitemap:before` / `.fa-indent:before` / `.fa-th-list:before` **各命中 1 次**；FA5+ 四个名字命中 **0 次**；`git grep 'fa-list-ol' -- src/` **零命中**。**spec 准确。**

### 出入 12（供参考）：`public/images/random/` 确为 40 张

- spec 第 130 行说「实测该目录 40 张」。**实测**：`ls public/images/random/ | wc -l` = **40**，文件名 `tb1.jpg` … `tb40.jpg`。**spec 准确**（`getCover` 的 `% 40 + 1` 与之配套）。

---

## 附：实测环境事实（供实现子代理自检）

- 文章总数 `src/content/posts/` 直接子目录 = **29**（spec 第 96 行说「现有 29 篇文章」准确）
- `看懂AI写的网站` 字符串 `git grep` 在版本控制内**只命中 4 篇 frontmatter 第 6 行** + spec/tickets 文档自身（spec 第 203 行的说法准确；`output/` 与 `.zcode/` 不在版本控制）
- `src/pages/` 下**没有** `series/`；`src/components/widget/` 下**没有** `WidgetSeries.astro`；`src/utils/` 下**没有** `posts-schema.ts` / `series-integrity.ts`；`src/data/` 下**没有** `series.ts` —— 本方案要新建的 5 个文件当前都不存在
- `docs/adr/` 现为 0001–**0007**（0007 已落地）
- `tsconfig.json:15` 的别名：`"@constants/*": ["src/constants/*"]`
- Prettier：`tabWidth 4` / `useTabs true`（`AGENTS.md:285`）
- `pnpm test:utils` 是 `pnpm build` 链的一环（`AGENTS.md:271`，`content-utils 排序/评分/邻篇 + pagination canonical`）
- 冒烟脚本均**不在 CI**（`AGENTS.md:308`）；新增的 `scripts/series-smoke.mjs` 建议默认 `http://localhost:4322`（`pnpm preview --port 4322`），与 `test:fancybox` / `smoke:ui` / `smoke:pelican` 同口径（Windows 上 Astro preview 只绑 `[::1]`，故用 `localhost` 不用 `127.0.0.1`）


