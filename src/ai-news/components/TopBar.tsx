import { ArrowLeft, RefreshCw, Search, Settings, X } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";
import { SOURCE_LOCKED } from "../config/sources";

/** 相对时间：用于「最后更新」。 */
function formatRelative(iso: string | null): string {
	if (!iso) return "尚未更新";
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return "尚未更新";
	const diff = Date.now() - t;
	if (diff < 60_000) return "刚刚更新";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前更新`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前更新`;
	return `${Math.floor(diff / 86_400_000)} 天前更新`;
}

/** 顶栏：品牌 + 订阅源 + 抓取状态 + 搜索 + 刷新 + 设置入口。 */
export function TopBar(): JSX.Element {
	const source = useAppStore((s) => s.source);
	const refreshing = useAppStore((s) => s.refreshing);
	const refresh = useAppStore((s) => s.refresh);
	const dataSource = useAppStore((s) => s.dataSource);
	const lastRefreshedAt = useAppStore((s) => s.lastRefreshedAt);
	const lastError = useAppStore((s) => s.lastError);
	const query = useAppStore((s) => s.query);
	const setQuery = useAppStore((s) => s.setQuery);
	const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

	return (
		<header className="flex flex-none flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
			<a
				href="/"
				data-no-swup
				aria-label="返回主站"
				className="inline-flex items-center gap-1 rounded-card px-2 py-1.5 text-sm text-text-secondary hover:bg-chip"
			>
				<ArrowLeft size={16} aria-hidden="true" />
				<span className="hidden sm:inline">返回主站</span>
			</a>
			<div className="flex min-w-0 items-center gap-2">
				<h1 className="font-heading text-base font-bold text-text">
					AI 日报
				</h1>
				<span
					className="rounded bg-chip px-1.5 py-0.5 text-xs text-chip-text"
					title={source.url}
				>
					{source.name}
				</span>
				{SOURCE_LOCKED && (
					<span className="hidden text-[11px] text-text-secondary sm:inline">
						内置源
					</span>
				)}
			</div>

			<div className="hidden min-w-0 items-center gap-2 text-xs text-text-secondary md:flex">
				<span>{formatRelative(lastRefreshedAt)}</span>
				{dataSource === "snapshot" && (
					<span className="rounded border border-border px-1.5 py-0.5 text-accent">
						离线快照
					</span>
				)}
				{lastError && !refreshing && (
					<span
						className="max-w-[16rem] truncate text-accent"
						title={lastError}
					>
						{lastError}
					</span>
				)}
			</div>

			<div className="ml-auto flex items-center gap-2">
				<div className="relative">
					<Search
						size={14}
						className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
					/>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="搜索标题 / 摘要 / 全文"
						className="w-56 rounded-card border border-border bg-card py-1.5 pl-8 pr-7 text-sm text-text placeholder:text-text-secondary"
					/>
					{query && (
						<button
							title="清空搜索"
							onClick={() => setQuery("")}
							className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:bg-chip"
						>
							<X size={13} />
						</button>
					)}
				</div>
				<button
					title="刷新"
					onClick={() => void refresh()}
					disabled={refreshing}
					className="rounded-card p-2 text-text-secondary transition-colors hover:bg-chip disabled:opacity-60"
				>
					<RefreshCw
						size={17}
						className={refreshing ? "animate-spin" : ""}
					/>
				</button>
				<button
					title="设置"
					onClick={() => setSettingsOpen(true)}
					className="rounded-card p-2 text-text-secondary transition-colors hover:bg-chip"
				>
					<Settings size={17} />
				</button>
			</div>
		</header>
	);
}
