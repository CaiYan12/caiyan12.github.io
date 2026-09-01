import { useMemo } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Bookmark, ExternalLink, Star } from "lucide-react";
import type { Article } from "../shared/types";
import { useAppStore } from "../stores/useAppStore";
import { parseJuyaIssue } from "../juya/parseJuyaIssue";
import { resolveJuyaVariant } from "../juya/effectiveJuyaStyle";
import { JUYA_TEMPLATES } from "../juya/templates";
import { JUYA_SOURCE_ID } from "../config/sources";
import { categoriesOf } from "../lib/categories";
import { formatDate } from "./ArticleCard";

interface Props {
	article: Article;
}

/** 阅读工具条：返回 / 标题日期 / 收藏 / 稍后读 / 原文。
 *  由 App 渲染在 sticky 吸顶区（顶栏下方一行），不随内容滚动。 */
export function ReaderToolbar({ article }: Props): JSX.Element {
	const history = useAppStore((s) => s.history);
	const toggleFavorite = useAppStore((s) => s.toggleFavorite);
	const toggleReadLater = useAppStore((s) => s.toggleReadLater);
	const openExternal = useAppStore((s) => s.openExternal);
	const back = useAppStore((s) => s.back);

	const entry = history[article.guid];
	const favorite = entry?.favorite ?? false;
	const readLater = entry?.readLater ?? false;

	return (
		<div className="view-nav flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
			<button
				onClick={back}
				className="flex items-center gap-1 rounded-card px-2 py-1.5 text-sm text-text transition-colors hover:bg-chip"
			>
				<ArrowLeft size={16} /> 返回
			</button>
			<div className="min-w-0 flex-1 truncate text-sm text-text-secondary">
				<span className="font-heading font-bold text-text">
					{article.title}
				</span>
				<span className="ml-2">{formatDate(article.pubDate)}</span>
			</div>
			<button
				title={favorite ? "取消收藏" : "收藏"}
				aria-pressed={favorite}
				onClick={() => toggleFavorite(article.guid)}
				className={`rounded-card p-2 transition-colors hover:bg-chip ${
					favorite ? "text-accent" : "text-text-secondary"
				}`}
			>
				<Star size={17} fill={favorite ? "currentColor" : "none"} />
			</button>
			<button
				title={readLater ? "移出稍后阅读" : "稍后阅读"}
				aria-pressed={readLater}
				onClick={() => toggleReadLater(article.guid)}
				className={`rounded-card p-2 transition-colors hover:bg-chip ${
					readLater ? "text-accent" : "text-text-secondary"
				}`}
			>
				<Bookmark
					size={17}
					fill={readLater ? "currentColor" : "none"}
				/>
			</button>
			<button
				title="在新标签打开原文"
				onClick={() => openExternal(article.link)}
				className="flex items-center gap-1 rounded-card px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-chip"
			>
				<ExternalLink size={16} /> 原文
			</button>
		</div>
	);
}

/** 详情页正文：橘鸦定制路径（源身份 + 风格开启 + 结构化解析成功）优先，
 *  任一不满足则静默回退通用渲染（DOMPurify 消毒后的原文 HTML）。
 *  文档流滚动：正文随页面滚动，吸顶工具条由 App 层负责。 */
export function ReaderView({ article }: Props): JSX.Element {
	const settings = useAppStore((s) => s.settings);
	const systemDark = useAppStore((s) => s.systemDark);
	const openExternal = useAppStore((s) => s.openExternal);

	const cleanHtml = useMemo(
		() =>
			DOMPurify.sanitize(article.contentHtml, {
				USE_PROFILES: { html: true },
				FORBID_TAGS: ["script", "iframe", "form", "input", "style"],
				FORBID_ATTR: ["style", "onerror", "onload"],
			}),
		[article.contentHtml],
	);

	const juya = useMemo(() => {
		if (article.sourceId !== JUYA_SOURCE_ID) return null;
		const variant = resolveJuyaVariant(settings, systemDark);
		if (!variant) return null;
		const issue = parseJuyaIssue(article.contentHtml);
		if (!issue) return null;
		return { variant, issue, template: JUYA_TEMPLATES[variant.styleId] };
	}, [article, settings, systemDark]);

	const categories = useMemo(() => categoriesOf(article), [article]);

	/** 拦截正文内链点击：统一新标签打开，禁止当前页原地导航 */
	const onContentClick = (e: React.MouseEvent<HTMLDivElement>): void => {
		const anchor = (e.target as HTMLElement).closest("a");
		if (!anchor) return;
		const href = anchor.getAttribute("href");
		if (!href || !/^https?:\/\//i.test(href)) return;
		e.preventDefault();
		openExternal(href);
	};

	return (
		<div className="flex-1">
			{juya ? (
				<juya.template.IssueView
					article={article}
					issue={juya.issue}
					variantId={juya.variant.id}
					onOpenLink={(href) => openExternal(href)}
				/>
			) : (
				<div className="reader-body mx-auto max-w-3xl px-6 py-8">
					{categories.length > 0 && categories[0] !== "未分类" && (
						<div className="mb-4 flex flex-wrap gap-1">
							{categories.map((c) => (
								<span
									key={c}
									className="rounded bg-chip px-2 py-0.5 text-xs text-chip-text"
								>
									{c}
								</span>
							))}
						</div>
					)}
					<h1 className="mb-6 font-heading text-3xl font-bold leading-tight text-accent">
						{article.title}
					</h1>
					<div
						className="article-content leading-relaxed"
						onClick={onContentClick}
						dangerouslySetInnerHTML={{ __html: cleanHtml }}
					/>
				</div>
			)}
		</div>
	);
}
