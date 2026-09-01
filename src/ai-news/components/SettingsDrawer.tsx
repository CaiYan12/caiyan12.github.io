import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, X } from "lucide-react";
import type { JuyaStyleId, LayoutConfig, Settings } from "../shared/types";
import { useAppStore } from "../stores/useAppStore";
import { resolveThemeScheme } from "../shared/theme";
import { JUYA_SOURCE_ID } from "../config/sources";
import { juyaStylesForScheme } from "../juya/juyaStyles";
import { Select } from "./Select";

/** 设置抽屉：右侧滑出，Esc / 点遮罩关闭。
 *  承载原桌面端「设置标签页」的全部内容（主题 / 布局 / 橘鸦风格 / 数据），
 *  并额外提供订阅源说明与本地数据清除入口。 */

const LAYOUT_PRESETS: Array<{ value: LayoutConfig["preset"]; label: string }> =
	[
		{ value: "compact", label: "紧凑列表" },
		{ value: "grid", label: "卡片网格" },
		{ value: "magazine", label: "杂志风" },
	];

const FIELD_LABELS: Array<{
	key: keyof LayoutConfig["fields"];
	label: string;
}> = [
	{ key: "cover", label: "封面" },
	{ key: "summary", label: "摘要" },
	{ key: "pubDate", label: "时间" },
	{ key: "source", label: "来源" },
];

const REFRESH_OPTIONS = [
	{ value: "0", label: "关闭" },
	{ value: "15", label: "15 分钟" },
	{ value: "30", label: "30 分钟" },
	{ value: "60", label: "1 小时" },
	{ value: "120", label: "2 小时" },
];

/** 分区标题：与「偏好」区同款的分隔线样式 */
function SectionTitle({ children }: { children: string }): JSX.Element {
	return (
		<h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
			{children}
		</h3>
	);
}

export function SettingsDrawer(): JSX.Element | null {
	const open = useAppStore((s) => s.settingsOpen);
	const setOpen = useAppStore((s) => s.setSettingsOpen);
	const settings = useAppStore((s) => s.settings);
	const themes = useAppStore((s) => s.themes);
	const source = useAppStore((s) => s.source);
	const systemDark = useAppStore((s) => s.systemDark);
	const articles = useAppStore((s) => s.articles);
	const updateSettings = useAppStore((s) => s.updateSettings);
	const setThemeMode = useAppStore((s) => s.setThemeMode);
	const setThemeForScheme = useAppStore((s) => s.setThemeForScheme);
	const setJuyaStyle = useAppStore((s) => s.setJuyaStyle);

	const [closing, setClosing] = useState(false);
	const [confirmClear, setConfirmClear] = useState(false);

	const close = (): void => {
		setClosing(true);
		setTimeout(() => {
			setClosing(false);
			setOpen(false);
			setConfirmClear(false);
		}, 220);
	};

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	if (!open) return null;

	const lightThemes = themes.filter((t) => resolveThemeScheme(t) === "light");
	const darkThemes = themes.filter((t) => resolveThemeScheme(t) === "dark");

	const themeModes: Array<{
		id: Settings["themeMode"];
		label: string;
		icon: typeof Sun;
	}> = [
		{ id: "system", label: "跟随系统", icon: Monitor },
		{ id: "light", label: "亮色", icon: Sun },
		{ id: "dark", label: "暗色", icon: Moon },
	];

	const setPreset = (preset: LayoutConfig["preset"]): void => {
		updateSettings({ layout: { ...settings.layout, preset } });
	};

	const setColumns = (n: LayoutConfig["gridColumns"]): void => {
		updateSettings({ layout: { ...settings.layout, gridColumns: n } });
	};

	const toggleField = (key: keyof LayoutConfig["fields"]): void => {
		updateSettings({
			layout: {
				...settings.layout,
				fields: {
					...settings.layout.fields,
					[key]: !settings.layout.fields[key],
				},
			},
		});
	};

	return (
		<div className="fixed inset-0 z-40 flex justify-end">
			<div
				className="drawer-scrim absolute inset-0 bg-black/30"
				data-closing={closing}
				onClick={close}
			/>
			<aside
				role="dialog"
				aria-label="设置"
				data-closing={closing}
				className="drawer-panel relative flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-xl"
			>
				<div className="view-nav flex flex-none items-center justify-between border-b border-border px-4 py-2.5">
					<h2 className="font-heading text-base font-bold text-text">
						设置
					</h2>
					<button
						onClick={close}
						className="rounded-card p-1.5 text-text-secondary hover:bg-chip"
					>
						<X size={17} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4">
					{/* ---- 外观 ---- */}
					<section className="mb-6">
						<SectionTitle>外观</SectionTitle>
						<div className="mb-3 grid grid-cols-3 gap-2">
							{themeModes.map((m) => {
								const Icon = m.icon;
								const active = settings.themeMode === m.id;
								return (
									<button
										key={m.id}
										onClick={() => setThemeMode(m.id)}
										className={`flex flex-col items-center gap-1 rounded-card border px-2 py-2 text-xs transition-colors ${
											active
												? "border-accent text-accent"
												: "border-border bg-card text-text-secondary hover:bg-chip"
										}`}
									>
										<Icon size={16} />
										{m.label}
									</button>
								);
							})}
						</div>
						<div className="grid grid-cols-2 gap-2">
							<label className="text-xs text-text-secondary">
								亮色主题
								<div className="mt-1">
									<Select
										value={settings.lightThemeId}
										onChange={(id) =>
											setThemeForScheme("light", id)
										}
										options={lightThemes.map((t) => ({
											value: t.id,
											label: t.name,
										}))}
									/>
								</div>
							</label>
							<label className="text-xs text-text-secondary">
								暗色主题
								<div className="mt-1">
									<Select
										value={settings.darkThemeId}
										onChange={(id) =>
											setThemeForScheme("dark", id)
										}
										options={darkThemes.map((t) => ({
											value: t.id,
											label: t.name,
										}))}
									/>
								</div>
							</label>
						</div>
						<p className="mt-2 text-[11px] text-text-secondary">
							当前系统为{systemDark ? "暗色" : "亮色"}
							，跟随系统时按此取对应侧主题。
						</p>
					</section>

					{/* ---- 橘鸦定制阅读风格 ---- */}
					<section className="mb-6 border-t border-border pt-4">
						<SectionTitle>橘鸦定制阅读风格</SectionTitle>
						<div className="grid grid-cols-2 gap-2">
							<label className="text-xs text-text-secondary">
								亮色侧
								<div className="mt-1">
									<Select
										value={settings.juyaLightStyleId}
										onChange={(id) =>
											setJuyaStyle(
												"light",
												id as JuyaStyleId,
											)
										}
										options={[
											{ value: "off", label: "关闭" },
											...juyaStylesForScheme("light").map(
												(s) => ({
													value: s.styleId,
													label: s.name,
												}),
											),
										]}
									/>
								</div>
							</label>
							<label className="text-xs text-text-secondary">
								暗色侧
								<div className="mt-1">
									<Select
										value={settings.juyaDarkStyleId}
										onChange={(id) =>
											setJuyaStyle(
												"dark",
												id as JuyaStyleId,
											)
										}
										options={[
											{ value: "off", label: "关闭" },
											...juyaStylesForScheme("dark").map(
												(s) => ({
													value: s.styleId,
													label: s.name,
												}),
											),
										]}
									/>
								</div>
							</label>
						</div>
						<p className="mt-2 text-[11px] text-text-secondary">
							仅对内置橘鸦源生效；关闭后回退通用阅读页。
							{source.id !== JUYA_SOURCE_ID &&
								" 当前订阅源非橘鸦，此项不生效。"}
						</p>
					</section>

					{/* ---- 布局 ---- */}
					<section className="mb-6 border-t border-border pt-4">
						<SectionTitle>布局</SectionTitle>
						<div className="mb-3">
							<Select
								value={settings.layout.preset}
								onChange={(v) =>
									setPreset(v as LayoutConfig["preset"])
								}
								options={LAYOUT_PRESETS}
							/>
						</div>
						{settings.layout.preset !== "compact" && (
							<div className="mb-3">
								<div className="mb-1 text-xs text-text-secondary">
									列数
								</div>
								<div className="grid grid-cols-4 gap-2">
									{([1, 2, 3, 4] as const).map((n) => (
										<button
											key={n}
											onClick={() => setColumns(n)}
											className={`rounded-card border px-2 py-1 text-xs transition-colors ${
												settings.layout.gridColumns ===
												n
													? "border-accent text-accent"
													: "border-border bg-card text-text-secondary hover:bg-chip"
											}`}
										>
											{n} 列
										</button>
									))}
								</div>
							</div>
						)}
						<div>
							<div className="mb-1 text-xs text-text-secondary">
								显示字段
							</div>
							<div className="flex flex-wrap gap-2">
								{FIELD_LABELS.map((f) => (
									<button
										key={f.key}
										onClick={() => toggleField(f.key)}
										className={`rounded-card border px-2.5 py-1 text-xs transition-colors ${
											settings.layout.fields[f.key]
												? "border-accent bg-accent text-on-accent"
												: "border-border bg-card text-text-secondary hover:bg-chip"
										}`}
									>
										{f.label}
									</button>
								))}
							</div>
						</div>
					</section>

					{/* ---- 数据 ---- */}
					<section className="mb-6 border-t border-border pt-4">
						<SectionTitle>数据</SectionTitle>
						<label className="mb-3 block text-xs text-text-secondary">
							定时刷新间隔
							<div className="mt-1">
								<Select
									value={String(settings.refreshIntervalMin)}
									onChange={(v) =>
										updateSettings({
											refreshIntervalMin: Number(v),
										})
									}
									options={REFRESH_OPTIONS}
								/>
							</div>
						</label>
						<label className="mb-3 block text-xs text-text-secondary">
							历史保留天数（0 = 不限制）
							<input
								type="number"
								min={0}
								max={3650}
								value={settings.historyRetentionDays}
								onChange={(e) => {
									const n = Number(e.target.value);
									if (Number.isNaN(n)) return;
									updateSettings({
										historyRetentionDays: Math.min(
											3650,
											Math.max(0, Math.trunc(n)),
										),
									});
								}}
								className="mt-1 w-full rounded-card border border-border bg-card px-2.5 py-1.5 text-sm text-text"
							/>
						</label>

						<div className="rounded-card border border-border bg-card p-3">
							<div className="text-xs font-bold text-text">
								订阅源
							</div>
							<div className="mt-1 text-xs text-text-secondary">
								<div className="truncate">{source.name}</div>
								<a
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									className="block truncate text-accent hover:underline"
								>
									{source.url}
								</a>
							</div>
							<p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
								内置源锁定，页面不提供增删改。要更换订阅源，请修改{" "}
								<code className="rounded bg-chip px-1 py-0.5 text-chip-text">
									src/config/sources.ts
								</code>{" "}
								中的{" "}
								<code className="rounded bg-chip px-1 py-0.5 text-chip-text">
									DEFAULT_SOURCE
								</code>{" "}
								并重新构建。
							</p>
						</div>

						<div className="mt-3">
							{confirmClear ? (
								<div className="flex gap-2">
									<button
										onClick={() => {
											localStorage.removeItem(
												"ai-daily:v1",
											);
											window.location.reload();
										}}
										className="flex-1 rounded-card border border-accent bg-accent px-2.5 py-1.5 text-xs text-on-accent"
									>
										确认清除并重载
									</button>
									<button
										onClick={() => setConfirmClear(false)}
										className="rounded-card border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary hover:bg-chip"
									>
										取消
									</button>
								</div>
							) : (
								<button
									onClick={() => setConfirmClear(true)}
									className="rounded-card border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary hover:bg-chip"
								>
									清除本地数据（设置 / 缓存 {articles.length}{" "}
									期 / 已读收藏记录）
								</button>
							)}
						</div>
					</section>
				</div>
			</aside>
		</div>
	);
}
