import { useMemo, useState } from "react";
import { CheckCheck, SlidersHorizontal, Tag } from "lucide-react";
import type { FilterKind } from "../shared/types";
import { useAppStore } from "../stores/useAppStore";
import { collectCategories, UNCATEGORIZED } from "../lib/categories";

const FILTERS: Array<{ id: FilterKind; label: string }> = [
	{ id: "all", label: "全部" },
	{ id: "unread", label: "未读" },
	{ id: "favorite", label: "收藏" },
	{ id: "readLater", label: "稍后读" },
];

/** 筛选条：分类（自动从正文栏目提取）+ 阅读状态维度 + 批量已读。
 *  计数基于全量文章而非当前筛选结果，避免切维度时数字跳动造成误判。
 *  响应式：窄屏（<sm）收纳为「筛选」展开面板，桌面常显。 */
export function FilterBar(): JSX.Element {
	const articles = useAppStore((s) => s.articles);
	const history = useAppStore((s) => s.history);
	const filter = useAppStore((s) => s.filter);
	const setFilter = useAppStore((s) => s.setFilter);
	const category = useAppStore((s) => s.category);
	const setCategory = useAppStore((s) => s.setCategory);
	const markAllRead = useAppStore((s) => s.markAllRead);
	const [mobileOpen, setMobileOpen] = useState(false);

	const counts = useMemo(() => {
		let unread = 0;
		let favorite = 0;
		let readLater = 0;
		for (const a of articles) {
			const e = history[a.guid];
			if (!e?.read) unread += 1;
			if (e?.favorite) favorite += 1;
			if (e?.readLater) readLater += 1;
		}
		return { all: articles.length, unread, favorite, readLater };
	}, [articles, history]);

	const categories = useMemo(() => collectCategories(articles), [articles]);
	const showCategories = !(
		categories.length === 1 && categories[0] === UNCATEGORIZED
	);

	/** 面板主体：维度行 + 分类行。窄屏与桌面共用同一份 JSX。 */
	const panel = (
		<>
			<div className="flex flex-wrap items-center gap-2">
				{FILTERS.map((f) => (
					<button
						key={f.id}
						onClick={() => setFilter(f.id)}
						className={`rounded-card border px-2.5 py-1 text-xs transition-colors ${
							filter === f.id
								? "border-accent bg-accent text-on-accent"
								: "border-border bg-card text-text-secondary hover:bg-chip"
						}`}
					>
						{f.label}
						<span className="ml-1 tabular-nums opacity-80">
							{counts[f.id]}
						</span>
					</button>
				))}
				<button
					onClick={markAllRead}
					className="ml-auto flex items-center gap-1 rounded-card border border-border bg-card px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-chip"
				>
					<CheckCheck size={13} /> 全部标为已读
				</button>
			</div>

			{showCategories && (
				<div className="flex flex-wrap items-center gap-1.5">
					<Tag size={13} className="shrink-0 text-text-secondary" />
					<button
						onClick={() => setCategory(null)}
						className={`rounded px-2 py-0.5 text-xs transition-colors ${
							category === null
								? "bg-accent text-on-accent"
								: "bg-chip text-chip-text hover:bg-border"
						}`}
					>
						全部分类
					</button>
					{categories.map((c) => (
						<button
							key={c}
							onClick={() =>
								setCategory(category === c ? null : c)
							}
							className={`rounded px-2 py-0.5 text-xs transition-colors ${
								category === c
									? "bg-accent text-on-accent"
									: "bg-chip text-chip-text hover:bg-border"
							}`}
						>
							{c}
						</button>
					))}
				</div>
			)}
		</>
	);

	return (
		<div className="flex flex-none flex-col border-b border-border bg-surface px-4 py-2">
			{/* 窄屏收纳头：筛选按钮 + 未读徽标（桌面隐藏） */}
			<div className="flex items-center gap-2 sm:hidden">
				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					aria-expanded={mobileOpen}
					className={`flex items-center gap-1 rounded-card border px-2.5 py-1 text-xs transition-colors ${
						mobileOpen
							? "border-accent bg-accent text-on-accent"
							: "border-border bg-card text-text-secondary hover:bg-chip"
					}`}
				>
					<SlidersHorizontal size={13} /> 筛选
				</button>
				{counts.unread > 0 && (
					<span className="rounded bg-chip px-2 py-0.5 text-xs text-chip-text tabular-nums">
						{counts.unread} 条未读
					</span>
				)}
			</div>

			{/* 面板：窄屏 grid-rows 折叠展开（见 index.css .filter-collapse），桌面常开。
          间距放内层 pt-2：闭合时随 0fr 一起裁掉，不留幻影 gap */}
			<div className="filter-collapse" data-open={mobileOpen}>
				<div className="filter-collapse-inner">
					<div className="flex flex-col gap-2 pt-2 sm:pt-0">
						{panel}
					</div>
				</div>
			</div>
		</div>
	);
}
