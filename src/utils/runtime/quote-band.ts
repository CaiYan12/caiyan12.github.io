/**
 * 语录条（主站白卡之下、页脚之上的一句工程格言）运行时模块。
 *
 * 服务端渲染的是固定默认句（无 JS 地板线 + 产物逐字节确定），这里在访客滚到它时
 * 换成随机一句，并跑一次四段级联入场。元件挂在 swup 容器之外，切页不重建，
 * 所以按 AGENTS.md 的协议只随装配表初始化一次、靠 dataset 守卫防重入，不自听
 * astro:* 事件。语料的读取推迟到 IntersectionObserver 回调里：head 里的 defer
 * 经典脚本与 Astro 注入的模块脚本谁先跑不由我们控制，而回调必然晚于两者 —— 不赌顺序。
 */
declare global {
	interface Window {
		/** 语录条语料，由 public/quotes/quote-catalog.js 以 head 里的 defer 经典脚本挂上 */
		__quoteCorpus?: string[][];
	}
}

/** 语录条的入场节奏。两套速度：首次是"给读者看的开场"，换句是"回应一次点击"——
 *  同一条 1.4s 级联原速重播两遍会让按钮显得迟钝，所以换句走快节奏那一档。
 *  window = 逐字符错峰总窗口，stepMax = 单步上限，其余是各段自身时长。
 *  这些数字通过 --quote-* 自定义属性下发给 CSS，两边不是两份表 */
export const QUOTE_TEMPO_FIRST = {
	window: 480,
	stepMax: 22,
	char: 380,
	gap: 40,
	zh: 420,
	by: 260,
	btn: 200,
};
export const QUOTE_TEMPO_FAST = {
	window: 220,
	stepMax: 12,
	char: 240,
	gap: 30,
	zh: 280,
	by: 180,
	btn: 140,
};
/** 退场与入场**同序同向**（站长 2026-09-30 指定，否决了我最初设想的"倒放"）：
 *  英文从左边第一个字开始依次收掉 → 中文从左往右擦走 → 署名 → 按钮。
 *  window 给到 320ms 是为了让这道扫动能被看见：首版给 120ms，49 个字摊下来每字
 *  2.5ms，逐帧实测就是一闪而过、没有"从左收回右"的方向感。
 *  tailAt 让后三段不等英文扫完就跟上（东西在消失，没必要严格接力），
 *  否则整段退场拖到 0.78s、加上新句入场接近 1.7s，点击会显得迟钝。 */
export const QUOTE_TEMPO_LEAVE = {
	window: 320,
	stepMax: 12,
	char: 150,
	gap: 20,
	zh: 160,
	by: 140,
	btn: 120,
	tailAt: 200,
};
/** 换行导致的高度变化用 --ease-drawer 走这段；它是全站已有的抽屉曲线，不新造 */
const QUOTE_HEIGHT_MS = 320;
/** reduced-motion 下换句只留这一记纯淡入淡出（撤位移保级联的裁决在 CSS 里） */
const QUOTE_SWAP_FADE_MS = 150;

/** 语料读取与形状校验：三列（英文/中文/署名）且英文非空才算可用行 */
export function quotePool(): string[][] {
	const corpus = window.__quoteCorpus;
	if (!Array.isArray(corpus)) return [];
	return corpus.filter(
		(row) => Array.isArray(row) && row.length === 3 && row[0].length > 0,
	);
}

/** 把英文行切成「词包字」：逐字 <span> 才能各自入场，但逐字会让英文在行尾被拆开，
 *  所以外层再包一层 inline-block 的词，断行只发生在词与词之间 */
export function typesetQuoteChars(el: HTMLElement, text: string): number {
	el.textContent = "";
	let index = 0;
	for (const chunk of text.split(/(\s+)/)) {
		if (!chunk) continue;
		if (/^\s+$/.test(chunk)) {
			el.appendChild(document.createTextNode(chunk));
			continue;
		}
		const word = document.createElement("span");
		word.className = "quote-band__word";
		for (const char of chunk) {
			const charEl = document.createElement("span");
			charEl.className = "quote-band__char";
			charEl.style.setProperty("--quote-i", String(index++));
			charEl.textContent = char;
			word.appendChild(charEl);
		}
		el.appendChild(word);
	}
	return index;
}

/** 汤宪滨宋（ZeoSeven FontsAPI 项目 2401）—— 语录条中文行的风格化宋体，
 *  站长在 8 款宋体实测样张里点名选的，理由是两项全场最低：CSS 36KB、
 *  一行 20 字命中 6 个分片 / 183.5KB。
 *  这张样式表**不进 head**：带子在页脚上方，多数访客根本不滚到那里，
 *  所以由一个"提前 45% 视口"的 IntersectionObserver 在接近时注入一次，
 *  让字体有机会在揭示动画开始前就位。CDN 不可达时按 --font-quote-zh 的栈
 *  回落到正文黑体，属可接受降级（与 /about/ 依赖同一服务，不是新增信任面）。 */
const QUOTE_ZH_FONT_CSS = "https://fontsapi.zeoseven.com/2401/main/result.css";
let quoteFontRequested = false;

function loadQuoteZhFont() {
	if (quoteFontRequested) return;
	quoteFontRequested = true;
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = QUOTE_ZH_FONT_CSS;
	link.setAttribute("data-quote-font", "");
	document.head.appendChild(link);
}

/** 把一段节奏算成 CSS 自定义属性下发。prefix 为空是入场、"-leave" 是退场，
 *  两套走同一个函数，保证"同序同向"不是两份手抄的表。返回这一段的收尾时刻（ms）。 */
export type QuoteTempo = typeof QUOTE_TEMPO_FIRST & { tailAt?: number };

export function writeQuoteTempo(
	band: HTMLElement,
	prefix: string,
	tempo: QuoteTempo,
	charCount: number,
): number {
	const step =
		charCount > 1
			? Math.min(tempo.stepMax, tempo.window / (charCount - 1))
			: 0;
	// 后三段必须等英文**真的**跑完再起步。写死延迟的实测后果：118 字符那句里
	// 中文 580ms 就收尾了、英文要到 860ms 才落完，读起来译文先于原文。
	const charEnd = (charCount - 1) * step + tempo.char;
	// 退场例外：东西在消失，没必要严格接力，所以给 tailAt 让它们提前跟上
	const zhDelay = tempo.tailAt ?? charEnd + tempo.gap;
	const byDelay =
		tempo.tailAt !== undefined
			? tempo.tailAt + 70
			: zhDelay + Math.round(tempo.zh * 0.6);
	const btnDelay =
		tempo.tailAt !== undefined
			? tempo.tailAt + 140
			: byDelay + Math.round(tempo.by * 0.5);
	const set = (key: string, value: number) =>
		band.style.setProperty(
			`--quote${prefix}-${key}`,
			`${Math.round(value)}ms`,
		);
	set("step", step);
	set("char-ms", tempo.char);
	set("zh-delay", zhDelay);
	set("zh-ms", tempo.zh);
	set("by-delay", byDelay);
	set("by-ms", tempo.by);
	set("btn-delay", btnDelay);
	set("btn-ms", tempo.btn);
	// 英文扫尾可能比最后一段更晚收，取两者较晚者当收尾时刻
	return Math.max(charEnd, btnDelay + tempo.btn);
}

/**
 * 均匀随机下标：用平台 CSPRNG（浏览器 Secure Context 均有 crypto.getRandomValues）。
 * 选句是展示随机、安全性无关紧要，但内置安全扫描把 Math.random 一律标为「弱随机数」，
 * 用 getRandomValues 零成本消掉这条误报；上限取模的偏置对 42 条语料可忽略。
 */
export function randomIndex(upperBound: number): number {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	return buffer[0] % upperBound;
}

/**
 * 换句选取的纯函数核：不得连抽到同一句——先剔掉当前句再随机，而不是"抽到重抽"，
 * 后者的循环在语料出现重复文本时会转不出去。剔除后为空（语料只有当前句）时
 * 回退整池，保证总有值；空池返回 undefined。
 * `nextIndex` 可注入（测试用确定性序列；生产走 randomIndex）。
 */
export function pickOtherFrom(
	pool: string[][],
	current: string,
	nextIndex: (upperBound: number) => number = randomIndex,
): string[] | undefined {
	if (pool.length === 0) return undefined;
	const candidates = pool.filter((row) => row[0] !== current);
	const list = candidates.length > 0 ? candidates : pool;
	return list[nextIndex(list.length)];
}

/** 语录条 init：自足幂等（dataset 守卫防重入），import 无副作用 */
export function initQuoteBand() {
	const band = document.querySelector<HTMLElement>("[data-quote-band]");
	if (!band || band.dataset.quoteBandReady === "true") return;
	band.dataset.quoteBandReady = "true";

	const enEl = band.querySelector<HTMLElement>("[data-quote-en]");
	const zhEl = band.querySelector<HTMLElement>("[data-quote-zh]");
	const authorEl = band.querySelector<HTMLElement>("[data-quote-author]");
	const reroll = band.querySelector<HTMLButtonElement>("[data-quote-reroll]");
	if (!enEl || !zhEl || !authorEl) return;

	let current = "";

	/** 展示态永远带真体引号——`QuoteBand.astro` 的 SSR 就是带引号发的，
	 *  逐字切分若按不含引号的 `current` 重建，JS 一开引号就被抹掉，两种状态给访客的不同。 */
	const quoteDisplay = (text: string) => `“${text}”`;

	/** 入场之后英文行退回纯文本（逐字 span 已完成使命），换句才不会被逐字规则遮住 */
	const applyQuote = (row: string[]) => {
		current = row[0];
		enEl.textContent = quoteDisplay(row[0]);
		zhEl.textContent = row[1];
		authorEl.textContent = row[2];
	};

	const pickOther = (pool: string[][]) => pickOtherFrom(pool, current);

	let swapping = false;
	const prefersReducedMotion = () =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/** 跑一遍内容级联（英文逐字 → 中文擦入 → 署名 → 按钮）。
	 *  逐字符节点必须在这里现切：每次收尾后文本会拍平回纯节点，换句才不会被逐字规则遮住。 */
	const runCascade = (tempo: QuoteTempo) => {
		const charCount = typesetQuoteChars(enEl, quoteDisplay(current));
		const end = writeQuoteTempo(band, "", tempo, charCount);
		band.classList.add("is-armed", "is-revealed");
		return end;
	};

	/** 收尾摘状态类。不摘的话动画的 forwards 填充会一直压着 opacity，
	 *  「换一句」的 transition 抢不过它，带子会卡在透明态出不来。 */
	const settleCascade = (endMs: number, heightMs = 0) => {
		window.setTimeout(
			() => {
				band.classList.remove("is-armed", "is-revealed", "is-resizing");
				band.style.height = "";
			},
			Math.round(Math.max(endMs, heightMs) + 140),
		);
	};

	const reveal = () => {
		const row = pickOther(quotePool());
		if (row) {
			applyQuote(row);
		} else {
			// 语料没到（404 / 被挡）：保留服务端默认句照常入场，绝不留空白带子
			current = (enEl.textContent ?? "").replace(/[“”]/g, "").trim();
		}
		settleCascade(runCascade(QUOTE_TEMPO_FIRST));
	};

	if (reroll) {
		reroll.addEventListener("click", () => {
			const row = pickOther(quotePool());
			if (!row || swapping) return;
			// 打上这个类，容器那一段（整条落下）此后不再重播：换句时卡片已经在屏幕上，
			// 让它再淡出淡入一次只会闪背景。带子本体只负责平滑改高度。
			band.classList.add("is-reroll");
			if (prefersReducedMotion()) {
				swapping = true;
				band.classList.add("is-swapping");
				window.setTimeout(() => {
					applyQuote(row);
					band.classList.remove("is-swapping");
					swapping = false;
					delete band.dataset.quoteBusy;
				}, QUOTE_SWAP_FADE_MS);
				return;
			}
			swapping = true;
			// 忙碌标记：给测试与将来的复用者一个真实的空闲信号，
			// 而不是靠猜动画有多长
			band.dataset.quoteBusy = "1";
			const h0 = band.getBoundingClientRect().height;
			band.style.height = `${h0}px`;
			// 退场同样要逐字节点，所以把当前文本再切一遍；新节点必须先算一帧样式，
			// transition 才有起点 —— 同一帧里加 class 会直接跳到终态、看不出过程。
			const charCount = typesetQuoteChars(enEl, quoteDisplay(current));
			const leaveEnd = writeQuoteTempo(
				band,
				"-leave",
				QUOTE_TEMPO_LEAVE,
				charCount,
			);
			void band.offsetWidth;
			band.classList.add("is-leaving");
			window.setTimeout(() => {
				band.classList.remove("is-leaving");
				applyQuote(row);
				// 高度过渡：钉住旧高 → 放开量自然高 → 回钉旧高 → 强制回流 → 给到新高
				band.classList.add("is-resizing");
				band.style.setProperty(
					"--quote-height-ms",
					`${QUOTE_HEIGHT_MS}ms`,
				);
				band.style.height = "auto";
				const h1 = band.getBoundingClientRect().height;
				band.style.height = `${h0}px`;
				void band.offsetWidth;
				band.style.height = `${h1}px`;
				const end = runCascade(QUOTE_TEMPO_FAST);
				settleCascade(end, QUOTE_HEIGHT_MS);
				window.setTimeout(
					() => {
						swapping = false;
						delete band.dataset.quoteBusy;
					},
					Math.round(Math.max(end, QUOTE_HEIGHT_MS) + 140),
				);
			}, Math.round(leaveEnd));
		});
	}

	// 隐藏初态只在这一刻生效：CSS 默认全可见，无 JS 的访客看到的就是服务端那句
	band.classList.add("is-armed");
	if (typeof IntersectionObserver === "undefined") {
		loadQuoteZhFont();
		reveal();
		return;
	}
	// 比揭示早一档把 CDN 字体要下来，给它时间在入场开始前就位
	const fontObserver = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			fontObserver.disconnect();
			loadQuoteZhFont();
		},
		{ rootMargin: "0px 0px 45% 0px" },
	);
	fontObserver.observe(band);
	const observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect(); // 一次性：反复重播是界面在和读者作对
			reveal();
		},
		{ rootMargin: "0px 0px -8% 0px" },
	);
	observer.observe(band);
}
