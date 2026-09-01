import { useMemo } from "react";
import type { Article, FilterKind, HistoryEntry } from "../shared/types";
import { useAppStore } from "../stores/useAppStore";
import { ArticleList } from "../layouts/ArticleList";
import { JUYA_SOURCE_ID } from "../config/sources";
import { resolveJuyaVariant } from "../juya/effectiveJuyaStyle";
import { JUYA_TEMPLATES } from "../juya/templates";
import { matchesQuery } from "../lib/search";
import { articleInCategory } from "../lib/categories";

/** 筛选维度判定：unread / favorite / readLater 互不排斥，但一次只按一个维度过滤。 */
function matchesFilter(
	article: Article,
	filter: FilterKind,
	history: Record<string, HistoryEntry>,
): boolean {
	const entry = history[article.guid];
	switch (filter) {
		case "unread":
			return !(entry?.read ?? false);
		case "favorite":
			return entry?.favorite ?? false;
		case "readLater":
			return entry?.readLater ?? false;
		default:
			return true;
	}
}

/** 主页：期号列表。数据源为橘鸦且风格开启时走风格化模板，否则走通用布局。
 *  搜索 / 筛选 / 分类在渲染前统一生效，两种路径看到的结果集一致。 */
export function HomeView(): JSX.Element {
	const articles = useAppStore((s) => s.articles);
	const history = useAppStore((s) => s.history);
	const settings = useAppStore((s) => s.settings);
	const systemDark = useAppStore((s) => s.systemDark);
	const source = useAppStore((s) => s.source);
	const query = useAppStore((s) => s.query);
	const filter = useAppStore((s) => s.filter);
	const category = useAppStore((s) => s.category);

	const visible = useMemo(
		() =>
			articles.filter(
				(a) =>
					matchesQuery(a, query) &&
					articleInCategory(a, category) &&
					matchesFilter(a, filter, history),
			),
		[articles, query, category, filter, history],
	);

	const juyaVariant =
		source.id === JUYA_SOURCE_ID
			? resolveJuyaVariant(settings, systemDark)
			: null;
	const JuyaFeed = juyaVariant
		? JUYA_TEMPLATES[juyaVariant.styleId].FeedList
		: null;

	return (
		<main className="flex-1">
			{JuyaFeed && juyaVariant ? (
				<JuyaFeed
					articles={visible}
					variantId={juyaVariant.id}
					layout={settings.layout}
				/>
			) : (
				<div className="p-4">
					<ArticleList articles={visible} layout={settings.layout} />
				</div>
			)}
		</main>
	);
}
