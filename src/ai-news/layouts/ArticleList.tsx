import type { CSSProperties } from "react";
import type { Article, LayoutConfig } from "../shared/types";
import { ArticleCard } from "../components/ArticleCard";
import { ArticleActions } from "../components/ArticleActions";
import { useAppStore } from "../stores/useAppStore";
import { formatDate } from "../components/ArticleCard";

interface Props {
	articles: Article[];
	layout: LayoutConfig;
}

/** 响应式网格列数样式：列数经 --cols 注入，窄屏由 CSS 降为单列 */
function colsStyle(columns: number): CSSProperties {
	return { "--cols": columns } as CSSProperties;
}

/** 紧凑列表：单行标题 + 日期 + 操作簇 */
function CompactList({ articles }: { articles: Article[] }): JSX.Element {
	const history = useAppStore((s) => s.history);
	const openArticle = useAppStore((s) => s.openArticle);
	return (
		<ul className="flex flex-col gap-1">
			{articles.map((a, i) => {
				const read = history[a.guid]?.read ?? false;
				return (
					<li key={a.guid}>
						<div
							role="button"
							tabIndex={0}
							onClick={() => openArticle(a)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									openArticle(a);
								}
							}}
							className="card-enter group relative flex w-full cursor-pointer items-center gap-3 rounded-card border border-border bg-card px-4 py-2.5 text-left transition-colors hover:bg-surface"
							style={{
								animationDelay: `${Math.min(i, 12) * 30}ms`,
							}}
						>
							<span
								className={`flex-1 truncate text-sm ${read ? "text-read" : "text-text"}`}
							>
								{a.title}
							</span>
							<span className="shrink-0 text-xs text-text-secondary">
								{formatDate(a.pubDate)}
							</span>
							<ArticleActions guid={a.guid} variant="inline" />
						</div>
					</li>
				);
			})}
		</ul>
	);
}

/** 杂志风：首条大幅 + 其余网格 */
function Magazine({ articles, layout }: Props): JSX.Element {
	const [featured, ...rest] = articles;
	return (
		<div className="flex flex-col gap-4">
			{featured && (
				<div className="magazine-featured">
					<ArticleCard
						article={featured}
						layout={{
							...layout,
							fields: {
								...layout.fields,
								cover: true,
								summary: true,
							},
						}}
						index={0}
					/>
				</div>
			)}
			<div className="cols-grid" style={colsStyle(layout.gridColumns)}>
				{rest.map((a, i) => (
					<ArticleCard
						key={a.guid}
						article={a}
						layout={layout}
						index={i + 1}
					/>
				))}
			</div>
		</div>
	);
}

export function ArticleList(props: Props): JSX.Element {
	const { articles, layout } = props;
	if (articles.length === 0) {
		return (
			<div className="flex h-48 items-center justify-center text-text-secondary">
				没有符合条件的日报
			</div>
		);
	}
	if (layout.preset === "compact") return <CompactList articles={articles} />;
	if (layout.preset === "magazine") return <Magazine {...props} />;
	return (
		<div className="cols-grid" style={colsStyle(layout.gridColumns)}>
			{articles.map((a, i) => (
				<ArticleCard
					key={a.guid}
					article={a}
					layout={layout}
					index={i}
				/>
			))}
		</div>
	);
}
