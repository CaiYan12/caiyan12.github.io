import { Minus, Plus, RotateCcw } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

const BTN =
	"rounded-full p-1 text-text-secondary transition-colors hover:bg-chip hover:text-accent";

/** 内容区右下角浮动缩放控件：只缩放阅读内容，自身与页面外壳保持固定尺寸。
 *  用 fixed 而不是 absolute：ai-news 是文档流滚动，绝对定位会随页面滚走。 */
export function ZoomWidget(): JSX.Element {
	const zoom = useAppStore((s) => s.settings.uiZoom);
	const setZoom = useAppStore((s) => s.setZoom);
	const percent = Math.round(zoom * 100);

	return (
		<div
			role="group"
			aria-label="内容缩放"
			className="fixed bottom-6 right-6 z-30 flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-1 shadow-sm"
		>
			<button
				type="button"
				title="缩小"
				aria-label="缩小"
				onClick={() => setZoom(zoom - 0.05)}
				className={BTN}
			>
				<Minus size={14} aria-hidden="true" />
			</button>
			<span
				aria-live="polite"
				className="w-11 select-none text-center text-xs tabular-nums text-text"
			>
				{percent}%
			</span>
			<button
				type="button"
				title="放大"
				aria-label="放大"
				onClick={() => setZoom(zoom + 0.05)}
				className={BTN}
			>
				<Plus size={14} aria-hidden="true" />
			</button>
			<button
				type="button"
				title="重置为 100%"
				aria-label="重置为 100%"
				onClick={() => setZoom(1)}
				className={BTN}
			>
				<RotateCcw size={13} aria-hidden="true" />
			</button>
		</div>
	);
}
