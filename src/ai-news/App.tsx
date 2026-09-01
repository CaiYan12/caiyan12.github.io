import { useEffect } from "react";
import { useAppStore } from "./stores/useAppStore";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { HomeView } from "./components/HomeView";
import { ReaderView, ReaderToolbar } from "./components/ReaderView";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Footer } from "./components/Footer";
import { BackToTop } from "./components/BackToTop";
import { Toast } from "./components/Toast";

/** 网页外壳：文档流滚动。顶栏（详情页连同阅读工具条）sticky 吸顶，
 *  下方按路由二选一 —— 主页（筛选条 + 期号列表）或详情页正文。
 *  路由来自 URL hash（#/issue/<guid>），浏览器前进/返回可用。 */
export default function App(): JSX.Element {
	const ready = useAppStore((s) => s.ready);
	const init = useAppStore((s) => s.init);
	const route = useAppStore((s) => s.route);
	const articles = useAppStore((s) => s.articles);
	const refreshing = useAppStore((s) => s.refreshing);
	const back = useAppStore((s) => s.back);

	useEffect(() => {
		void init();
	}, [init]);

	if (!ready) {
		return (
			<div className="flex min-h-screen items-center justify-center text-sm text-text-secondary">
				正在载入…
			</div>
		);
	}

	if (route.view === "issue") {
		const article = articles.find((a) => a.guid === route.guid);
		if (article) {
			return (
				<div className="flex min-h-screen flex-col">
					<div className="sticky top-0 z-30">
						<TopBar />
						<ReaderToolbar article={article} />
					</div>
					<ReaderView article={article} />
					<Footer />
					<BackToTop />
					<SettingsDrawer />
					<Toast />
				</div>
			);
		}
		// 直达链接 / 缓存被清理：文章尚未加载出来时先给载入态，加载完仍找不到才判为不存在
		return (
			<div className="flex min-h-screen flex-col">
				<div className="sticky top-0 z-30">
					<TopBar />
				</div>
				<div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-text-secondary">
					{articles.length === 0 && refreshing ? (
						<span>正在载入…</span>
					) : (
						<>
							<span>
								找不到这期日报，可能已被清理或链接有误。
							</span>
							<button
								onClick={back}
								className="rounded-card border border-border bg-card px-3 py-1.5 text-text hover:bg-chip"
							>
								返回列表
							</button>
						</>
					)}
				</div>
				<Footer />
				<SettingsDrawer />
				<Toast />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col">
			<div className="sticky top-0 z-30">
				<TopBar />
			</div>
			<FilterBar />
			<HomeView />
			<Footer />
			<BackToTop />
			<SettingsDrawer />
			<Toast />
		</div>
	);
}
