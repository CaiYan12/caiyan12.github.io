import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** 返回顶部：滚动超过一屏后出现在右下角，点击平滑回顶。
 *  尊重 prefers-reduced-motion：系统要求减少动效时改为直接跳转。 */
export function BackToTop(): JSX.Element | null {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = (): void => {
			setVisible(window.scrollY > window.innerHeight);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	if (!visible) return null;

	const scrollTop = (): void => {
		const reduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
	};

	return (
		<button
			title="返回顶部"
			onClick={scrollTop}
			className="backtop fixed bottom-6 right-6 z-40 rounded-full border border-border bg-accent p-3 text-on-accent shadow-lg transition-colors hover:bg-accent-hover"
		>
			<ArrowUp size={18} />
		</button>
	);
}
