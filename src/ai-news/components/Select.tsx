import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
	value: string;
	label: string;
}

/** 主题化下拉选择：原生 <select> 的弹出菜单无法随主题着色（Chromium 限制），故自绘。
 *  触发器与菜单全部使用主题 token，出入场复用 index.css 的 .menu-pop。
 *
 *  菜单经 createPortal 挂到 document.body 并用 fixed 定位：设置抽屉的正文是
 *  overflow-y-auto 滚动容器，绝对定位的菜单会被容器下边缘裁剪。 */
const CLOSE_MS = 180; // 与 .menu-pop 的 transition 时长一致
const MENU_MAX_H = 280; // 菜单最大高度上限，超出内部滚动
const MENU_MIN_H = 120; // 上下空间都极窄时的兜底高度
const GAP = 4; // 菜单与触发器间距

interface Anchor {
	left: number;
	width: number;
	top: number;
	bottom: number;
}

export function Select({
	value,
	onChange,
	options,
	className = "",
}: {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	className?: string;
}): JSX.Element {
	const [open, setOpen] = useState(false);
	const [closing, setClosing] = useState(false);
	const [dropUp, setDropUp] = useState(false);
	const [anchor, setAnchor] = useState<Anchor | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	/** 量取触发器位置并决定展开方向：下方空间不足且上方更宽裕时向上展开 */
	const place = (): void => {
		const r = rootRef.current?.getBoundingClientRect();
		if (!r) return;
		const spaceBelow = window.innerHeight - r.bottom - GAP;
		const spaceAbove = r.top - GAP;
		setAnchor({
			left: r.left,
			width: r.width,
			top: r.top,
			bottom: r.bottom,
		});
		setDropUp(spaceBelow < MENU_MAX_H && spaceAbove > spaceBelow);
	};

	const close = (): void => {
		if (closing) return;
		setClosing(true);
		closeTimer.current = setTimeout(() => {
			setOpen(false);
			setClosing(false);
			setAnchor(null);
		}, CLOSE_MS);
	};

	const toggle = (): void => {
		// closing 期间再点 = 中断退出、重新展开
		if (open && !closing) {
			close();
			return;
		}
		if (closeTimer.current) clearTimeout(closeTimer.current);
		setClosing(false);
		place();
		setOpen(true);
	};

	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent): void => {
			const target = e.target as Node;
			// 菜单已 portal 到 body，rootRef.contains 判不到它，需一并检查
			if (rootRef.current?.contains(target)) return;
			if (menuRef.current?.contains(target)) return;
			close();
		};
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Escape") close();
		};
		// 打开期间重算位置与方向：滚动/缩放改变触发器相对视口位置时同步
		window.addEventListener("mousedown", onDown);
		window.addEventListener("keydown", onKey);
		window.addEventListener("scroll", place, true);
		window.addEventListener("resize", place);
		return () => {
			window.removeEventListener("mousedown", onDown);
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("scroll", place, true);
			window.removeEventListener("resize", place);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, closing]);

	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);

	const current = options.find((o) => o.value === value);

	/** 可用高度：受展开方向一侧的剩余视口空间限制，但不低于兜底值 */
	const maxHeight = anchor
		? Math.max(
				MENU_MIN_H,
				Math.min(
					MENU_MAX_H,
					dropUp
						? anchor.top - GAP * 2
						: window.innerHeight - anchor.bottom - GAP * 2,
				),
			)
		: MENU_MAX_H;

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={toggle}
				className="flex w-full items-center justify-between gap-2 rounded-card border border-border bg-surface px-2.5 py-1.5 text-left text-sm text-text transition-colors hover:bg-chip"
			>
				<span className="truncate">{current?.label ?? value}</span>
				<ChevronDown
					size={14}
					className={`shrink-0 text-text-secondary transition-transform ${
						open && !closing ? "rotate-180" : ""
					}`}
				/>
			</button>
			{open &&
				anchor &&
				createPortal(
					<div
						ref={menuRef}
						data-closing={closing}
						data-dropup={dropUp}
						style={{
							position: "fixed",
							left: anchor.left,
							width: anchor.width,
							maxHeight,
							...(dropUp
								? {
										bottom:
											window.innerHeight -
											anchor.top +
											GAP,
									}
								: { top: anchor.bottom + GAP }),
						}}
						className="menu-pop z-[60] overflow-y-auto rounded-card border border-border bg-card py-1 shadow-lg"
					>
						{options.map((o) => (
							<button
								key={o.value}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => {
									onChange(o.value);
									close();
								}}
								className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-chip ${
									o.value === value
										? "text-accent"
										: "text-text"
								}`}
							>
								<span className="truncate">{o.label}</span>
								{o.value === value && (
									<Check size={14} className="shrink-0" />
								)}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
