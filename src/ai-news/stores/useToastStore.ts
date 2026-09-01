import { create } from "zustand";

/** 全局单例轻量提示（toast）：用于刷新失败、批量操作结果等一次性提示。
 *  连续调用不堆叠：只保留最新一条并重置 2.4s 自动清除计时。
 *  退场两阶段：先置 closing 驱动 CSS 退场过渡，再卸载文案（对称于进场）。 */
interface ToastState {
	message: string | null;
	closing: boolean;
	show(message: string): void;
	clear(): void;
}

// 计时器句柄：模块级（store 外），show 时先清旧的再设新的
let timer: ReturnType<typeof setTimeout> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;

const TOAST_DURATION_MS = 2400;
/** 与 index.css 的 .toast 过渡时长一致 */
const TOAST_EXIT_MS = 180;

export const useToastStore = create<ToastState>((set) => ({
	message: null,
	closing: false,

	show(message) {
		if (timer) clearTimeout(timer);
		if (exitTimer) {
			clearTimeout(exitTimer);
			exitTimer = null;
		}
		set({ message, closing: false });
		timer = setTimeout(() => {
			timer = null;
			set({ closing: true });
			exitTimer = setTimeout(() => {
				exitTimer = null;
				set({ message: null, closing: false });
			}, TOAST_EXIT_MS);
		}, TOAST_DURATION_MS);
	},

	clear() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (exitTimer) {
			clearTimeout(exitTimer);
			exitTimer = null;
		}
		set({ message: null, closing: false });
	},
}));
