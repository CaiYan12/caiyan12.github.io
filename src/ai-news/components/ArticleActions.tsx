import { Bookmark, Check, Star } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

/** 文章级操作簇：收藏 / 稍后阅读 / 已读切换。
 *  卡片与橘鸦期号条目共用同一套语义与图标，避免两处行为漂移。
 *  所有点击一律阻止冒泡并阻止默认行为——操作不应连带打开详情。
 *
 *  variant:
 *   - `float`  悬浮在卡片右上角（透明底 + 毛玻璃），未激活时 hover 才显形
 *   - `inline` 常驻排布（紧凑列表 / 橘鸦期号条目的元信息行） */

interface Props {
	guid: string;
	variant?: "float" | "inline";
	className?: string;
}

export function ArticleActions({
	guid,
	variant = "float",
	className = "",
}: Props): JSX.Element {
	const entry = useAppStore((s) => s.history[guid]);
	const toggleFavorite = useAppStore((s) => s.toggleFavorite);
	const toggleReadLater = useAppStore((s) => s.toggleReadLater);
	const toggleRead = useAppStore((s) => s.toggleRead);

	const favorite = entry?.favorite ?? false;
	const readLater = entry?.readLater ?? false;
	const read = entry?.read ?? false;

	const run =
		(fn: () => void) =>
		(e: React.MouseEvent<HTMLButtonElement>): void => {
			e.preventDefault();
			e.stopPropagation();
			fn();
		};

	const base =
		"rounded-full transition-opacity " +
		(variant === "float" ? "bg-surface/80 p-1.5 backdrop-blur " : "p-1 ");

	return (
		<span
			className={`flex items-center gap-0.5 ${variant === "float" ? "absolute right-2 top-2 z-10" : ""} ${className}`}
		>
			<button
				title={favorite ? "取消收藏" : "收藏"}
				aria-pressed={favorite}
				onClick={run(() => toggleFavorite(guid))}
				className={`${base} ${
					favorite
						? "text-accent opacity-100"
						: "text-text-secondary opacity-0 group-hover:opacity-100"
				}`}
			>
				<Star size={15} fill={favorite ? "currentColor" : "none"} />
			</button>
			<button
				title={readLater ? "移出稍后阅读" : "稍后阅读"}
				aria-pressed={readLater}
				onClick={run(() => toggleReadLater(guid))}
				className={`${base} ${
					readLater
						? "text-accent opacity-100"
						: "text-text-secondary opacity-0 group-hover:opacity-100"
				}`}
			>
				<Bookmark
					size={15}
					fill={readLater ? "currentColor" : "none"}
				/>
			</button>
			<button
				title={read ? "标记为未读" : "标记为已读"}
				aria-pressed={read}
				onClick={run(() => toggleRead(guid))}
				className={`${base} ${
					read
						? "text-text-secondary opacity-0 group-hover:opacity-100"
						: "text-accent opacity-100"
				}`}
			>
				{read ? (
					<Check size={15} />
				) : (
					<span className="block h-[9px] w-[9px] rounded-full border-2 border-current" />
				)}
			</button>
		</span>
	);
}
