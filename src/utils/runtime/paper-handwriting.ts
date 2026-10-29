/**
 * /about/ 稿纸手写感的运行时模块（单页专有，自 T8/#123 起从 theme-script 迁出）。
 *
 * 两件事必须住在同一个模块里，因为它们共用一套度量约定：
 * 1. 正文逐字符静态微随机（transform-only：rotate ±1.5° / translate ±1px、无动画、
 *    无布局位移；连续西文/数字片段保持整段不切分，避免单词内换行）；
 * 2. 横线网格相位反推（--lp-shift），由面板网格线对齐正文首行基线。
 *
 * 两处都靠 dataset 守卫防重复处理（`handwriting` / `rulePhaseBound`），Swup 切页后
 * 新 DOM 重新施加。**观察器生命周期（未在本票修复）**：`rulePhaseBound` 建在面板
 * 元素上，切页重建 DOM 后面板是新的，于是每次回到 /about/ 都会再 `new` 一个
 * ResizeObserver 并 observe 新面板；ResizeObserver 规范对观察目标持强引用、且随
 * 活跃观察保活，旧面板因此不会被回收、旧观察器也不会自行断开。详见报告结论。
 */
/** 逐字切分的产物：`isChar` 为真表示要包 span 施加手写微随机 */
export type PaperSegment = { text: string; isChar: boolean };

/**
 * 按**逐字切分规则**批发片段：西文/数字（含空格与半角标点）整段成组，
 * 单个非 ASCII 字符（CJK、全角标点）各自成组。
 * 正则与迁移前 theme-script 内的字面量完全一致，勿改写——它决定了单词内换行与否。
 */
export function splitPaperSegments(data: string): PaperSegment[] {
	const segments: string[] = data.match(/[\x20-\x7e]+|[^\x00-\x7f]/g) ?? [];
	return segments.map((text) => ({
		text,
		isChar: !/^[\x20-\x7e]+$/.test(text),
	}));
}

export type PaperShiftInput = {
	/** 面板行距周期 --lp-cycle */
	cycle: number;
	/** 正文首行基线相对正文盒顶的距离 --lp-baseline */
	baseline: number;
	/** 正文盒顶（viewport 坐标） */
	bodyTop: number;
	/** 面板顶（viewport 坐标） */
	panelTop: number;
	/** 面板 border-top 宽度：网格从 padding box 顶起画 */
	borderTop: number;
};

/**
 * 反推横线相位：面板网格线落在 padding box 顶 + shift - 1 + k*cycle 处，
 * 令其等于正文首行基线 y，即 shift = (正文盒顶相对 panel padding box 顶 + baseline) mod cycle。
 * 头部高度因此不必确定化（巨型标题是流式 clamp 字号，便签换行数随宽度变化）。
 * 读不到有效周期/基线时返回 null（调用方保持 CSS 的 --lp-baseline 回落值）。
 */
export function computePaperShift(input: PaperShiftInput): number | null {
	const { cycle, baseline, bodyTop, panelTop, borderTop } = input;
	if (!cycle || !baseline) return null;
	const originTop = panelTop + (borderTop || 0);
	const offset = bodyTop - originTop + baseline;
	return ((offset % cycle) + cycle) % cycle;
}

/**
 * 稿纸 init：查询 .letter-paper-body 与其面板 .letter-paper，施加逐字微随机并绑定
 * 相位观察器。无参、幂等（dataset 守卫），import 无副作用。
 */
export function initPaperHandwriting() {
	const paperBody = document.querySelector<HTMLElement>(".letter-paper-body");
	const panel = paperBody?.closest<HTMLElement>(".letter-paper");
	if (!paperBody || !panel || paperBody.dataset.handwriting === "true")
		return;
	paperBody.dataset.handwriting = "true";
	syncPaperRulePhase(panel, paperBody);
	if (!panel.dataset.rulePhaseBound) {
		panel.dataset.rulePhaseBound = "true";
		// 字体 swap、换行、缩放都会挪动正文首行，网格相位必须跟随
		new ResizeObserver(() => syncPaperRulePhase(panel, paperBody)).observe(
			panel,
		);
	}
	const walker = document.createTreeWalker(paperBody, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node as Text;
		if (text.data.trim()) textNodes.push(text);
	}
	for (const textNode of textNodes) {
		const fragment = document.createDocumentFragment();
		for (const segment of splitPaperSegments(textNode.data)) {
			if (!segment.isChar) {
				fragment.appendChild(document.createTextNode(segment.text));
				continue;
			}
			const span = document.createElement("span");
			span.className = "paper-hand-char";
			const rotate = (Math.random() * 3 - 1.5).toFixed(2);
			const dx = (Math.random() * 2 - 1).toFixed(2);
			const dy = (Math.random() * 2 - 1).toFixed(2);
			span.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;
			span.textContent = segment.text;
			fragment.appendChild(span);
		}
		textNode.replaceWith(fragment);
	}
}

/** 把面板已算出的周期/基线/几何换算成 --lp-shift。网格画在面板层，故从 panel 取样式。 */
export function syncPaperRulePhase(panel: HTMLElement, body: HTMLElement) {
	const style = getComputedStyle(panel);
	const shift = computePaperShift({
		cycle: parseFloat(style.getPropertyValue("--lp-cycle")),
		baseline: parseFloat(style.getPropertyValue("--lp-baseline")),
		bodyTop: body.getBoundingClientRect().top,
		panelTop: panel.getBoundingClientRect().top,
		borderTop: parseFloat(style.borderTopWidth) || 0,
	});
	if (shift === null) return;
	panel.style.setProperty("--lp-shift", `${shift}px`);
}
