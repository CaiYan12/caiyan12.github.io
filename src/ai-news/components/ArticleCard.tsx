import type { Article, LayoutConfig } from "../shared/types";
import { useAppStore } from "../stores/useAppStore";
import { ArticleActions } from "./ArticleActions";
import { categoriesOf } from "../lib/categories";

interface Props {
	article: Article;
	layout: LayoutConfig;
	index: number;
}

export function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ArticleCard({ article, layout, index }: Props): JSX.Element {
	const history = useAppStore((s) => s.history);
	const openArticle = useAppStore((s) => s.openArticle);
	const entry = history[article.guid];
	const read = entry?.read ?? false;
	const { fields } = layout;
	const categories = categoriesOf(article);

	return (
		<article
			role="button"
			tabIndex={0}
			onClick={() => openArticle(article)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openArticle(article);
				}
			}}
			className={`card-enter group relative flex cursor-pointer flex-col overflow-hidden rounded-card border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${
				read ? "opacity-70" : ""
			}`}
			style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
		>
			{fields.cover && article.coverUrl && (
				<img
					src={article.coverUrl}
					alt=""
					loading="lazy"
					onLoad={(e) => e.currentTarget.classList.add("img-loaded")}
					onError={(e) => e.currentTarget.classList.add("img-loaded")}
					className="img-fade h-36 w-full object-cover"
				/>
			)}
			<div className="flex flex-1 flex-col gap-1.5 p-4">
				<h3
					className={`font-heading text-base font-bold leading-snug ${
						read ? "text-read" : "text-text"
					}`}
				>
					{article.title}
				</h3>
				{fields.summary && article.summary && (
					<p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
						{article.summary}
					</p>
				)}
				{categories.length > 0 && categories[0] !== "未分类" && (
					<div className="flex flex-wrap gap-1 pt-1">
						{categories.map((c) => (
							<span
								key={c}
								className="rounded bg-chip px-1.5 py-0.5 text-[11px] text-chip-text"
							>
								{c}
							</span>
						))}
					</div>
				)}
				<div className="mt-auto flex items-center gap-2 pt-2 text-xs text-text-secondary">
					{fields.pubDate && (
						<span>{formatDate(article.pubDate)}</span>
					)}
				</div>
			</div>
			<ArticleActions guid={article.guid} variant="float" />
		</article>
	);
}
