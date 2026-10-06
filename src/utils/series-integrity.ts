// 文集内容完整性校验。规则 1–3 是纯函数（入参全部文章 + seriesList，出参违规清单），
// 由 src/pages/series/[slug].astro 的 getStaticPaths 调用；有违规即 throw，astro build 随之失败。
// 规则 4 是唯一需要 node:fs 的一条，故与纯函数分开、由调用侧传入 public 目录。
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Post } from "./content-utils";
import type { SeriesMeta } from "../data/series";

/**
 * 一条完整性违规：`source` 指名违规文件（规则 1–3 为文章 id、规则 4 为文集 slug），
 * `reason` 为人读原因；调用侧把两者逐条拼成构建报错清单。
 */
export interface SeriesViolation {
	source: string;
	reason: string;
}

/**
 * 规则 1–3 的**纯函数**：入参为全部文章与文集登记表，出参为违规清单（空数组 = 全部合规）。
 * 无 node:fs、无副作用，因此可进 pnpm test:utils。规则 4 见 `checkSeriesCovers`。
 *
 * - 规则 1：文章 `series` 的值必须能解析到 `seriesList` 里的一笔（否则 name / unit / description 无从取得）。
 * - 规则 2：同一文集内（分组按 `series` 的值，与登记表无关）`seriesOrder` 不得重复。
 * - 规则 3：带 `series` 的文章必须同时带 `seriesOrder`（不允许缺省回退发布时间）。
 */
export function checkSeriesIntegrity(
	posts: Post[],
	seriesList: SeriesMeta[],
): SeriesViolation[] {
	const violations: SeriesViolation[] = [];
	const knownSlugs = new Set(seriesList.map((s) => s.slug));
	// series 值 → (seriesOrder → 该序号下的文章 id 列表)，用于规则 2 的重复判定
	const ordersBySeries = new Map<string, Map<number, string[]>>();

	for (const post of posts) {
		const series = post.data.series;
		// 无 series 属性 = 非成员，不参与任何规则
		if (series === undefined) continue;

		// 规则 1：series 值必须已登记
		if (!knownSlugs.has(series)) {
			violations.push({
				source: post.id,
				reason: `series "${series}" 未在 src/data/series.ts 登记`,
			});
		}

		const order = post.data.seriesOrder;
		// 规则 3：带 series 必带 seriesOrder
		if (order === undefined) {
			violations.push({
				source: post.id,
				reason: `series "${series}" 缺少 seriesOrder（带 series 的文章必须显式给出组内序号）`,
			});
			// 没有序号，无法参与规则 2 的重复判定
			continue;
		}

		// 规则 2：按 series 值分组收集序号（与登记表无关）
		let byOrder = ordersBySeries.get(series);
		if (byOrder === undefined) {
			byOrder = new Map();
			ordersBySeries.set(series, byOrder);
		}
		const ids = byOrder.get(order);
		if (ids === undefined) byOrder.set(order, [post.id]);
		else ids.push(post.id);
	}

	// 规则 2：同一 series 内同一 seriesOrder 出现多篇 → 各报一条，指名全部涉事文件
	for (const [series, byOrder] of ordersBySeries) {
		for (const [order, ids] of byOrder) {
			if (ids.length > 1) {
				violations.push({
					source: ids.join("、"),
					reason: `series "${series}" 内 seriesOrder ${order} 重复`,
				});
			}
		}
	}

	return violations;
}

/**
 * 规则 4：`seriesList` 里写了 `cover` 的，该路径映射到 `public/` 下的文件必须存在。
 * 这是四条规则里唯一需要 `node:fs` 的一条，所以不进纯函数——由调用侧传入 `publicDir`
 * （正常构建下即 `join(process.cwd(), "public")`；据此在 astro build 的打包产物里也能定位）。
 */
export function checkSeriesCovers(
	seriesList: SeriesMeta[],
	publicDir: string,
): SeriesViolation[] {
	const violations: SeriesViolation[] = [];
	for (const series of seriesList) {
		if (series.cover === undefined) continue;
		if (!existsSync(join(publicDir, series.cover))) {
			violations.push({
				source: series.slug,
				reason: `cover "${series.cover}" 在 public/ 下不存在`,
			});
		}
	}
	return violations;
}
