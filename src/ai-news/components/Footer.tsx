import { Rss } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

/** 页脚：站名 + 订阅源链接 + 版权声明。置于页面末尾，
 *  内容不足一屏时由 flex 布局的 mt-auto 沉底。 */
export function Footer(): JSX.Element {
	const source = useAppStore((s) => s.source);

	return (
		<footer className="mt-auto border-t border-border bg-surface px-4 py-6">
			<div className="flex flex-col gap-1 text-xs text-text-secondary">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="font-heading text-sm font-bold text-text">
						AI 日报
					</span>
					<span aria-hidden>·</span>
					<Rss size={12} className="shrink-0" />
					<a
						href={source.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-accent hover:underline"
					>
						{source.name}
					</a>
					<span aria-hidden>·</span>
					<a
						href="/"
						data-no-swup
						className="text-accent hover:underline"
					>
						返回主站
					</a>
				</div>
				<div>内容来自订阅源 RSS，仅供学习阅读，版权归原作者所有。</div>
			</div>
		</footer>
	);
}
