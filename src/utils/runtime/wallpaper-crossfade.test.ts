// 壁纸交叉淡入与临时层的单测（票 #131）。
//
// 缝隙：`crossfadeBackground(原图层, 已确认可用的地址)`。给定真实 DOM 桩，
// 外部可观察的结果只有四件：原有图层上的临时层数量、临时层写到样式的层叠值、
// 原图层的 src 有没有被提交、以及返回的结局词。
//
// 为什么非测不可（票面原文）：
// · 临时层必须与原图层同层叠值（本站 -9999），绝不能高过 -998 的纹理遮罩，
//   否则淡入期间遮罩会被顶掉一帧；
// · 同一时刻只允许一个临时层；
// · 过渡结束、异常、中断三条路径都必须移除临时层，不许堆积。
//
// 口径：最小 DOM 桩（照 random-background.test.ts / wallpaper-pull-interaction.test.ts
// 的手法），不 sleep 等 320ms——相位由真实状态信号 `transitionend` 定义。
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { crossfadeBackground, TEMP_LAYER_CLASS } from "./wallpaper-crossfade";

const OLD_URL = "https://example.test/images/bg/a.jpg";
const NEW_URL = "https://example.test/images/bg/b.jpg";

/** 原图层在真实页面上算出来的值（global.css 层外规则：-9999；遮罩 -998） */
const ORIGINAL_STYLE: Record<string, string> = {
	"object-fit": "cover",
	"object-position": "center",
	opacity: "1",
	"z-index": "-9999",
};

type FakeListener = (event?: unknown) => void;

/** 只支持测试用到的那几件事：style.setProperty、事件、插入 / 移除 */
function makeElement(tag: string) {
	const props: Record<string, string> = {};
	const listeners = new Map<string, FakeListener[]>();
	const el = {
		tagName: tag.toUpperCase(),
		removed: false,
		offsetWidth: 100,
		className: "",
		attributes: {} as Record<string, string>,
		style: {
			props,
			setProperty(name: string, value: string) {
				props[name] = value;
			},
		},
		setAttribute(name: string, value: string) {
			el.attributes[name] = value;
		},
		addEventListener(type: string, listener: FakeListener) {
			const list = listeners.get(type) ?? [];
			list.push(listener);
			listeners.set(type, list);
		},
		removeEventListener(type: string, listener: FakeListener) {
			const list = listeners.get(type) ?? [];
			listeners.set(
				type,
				list.filter((item) => item !== listener),
			);
		},
		dispatch(type: string, event: unknown) {
			for (const listener of [...(listeners.get(type) ?? [])])
				listener(event);
		},
		listenerCount(type: string) {
			return (listeners.get(type) ?? []).length;
		},
		remove() {
			el.removed = true;
			docChildren = docChildren.filter((c) => c !== el);
		},
	};
	return el;
}

type FakeElement = ReturnType<typeof makeElement>;

/** 原图层桩：自己的 src / complete / naturalWidth / decode，和真实 <img> 同形 */
type FakeOriginal = FakeElement & {
	src: string;
	complete: boolean;
	naturalWidth: number;
	decode: () => Promise<void>;
	/** 写入 src 时的钩子：让用例决定「此刻是否已经就绪」 */
	onSrcSet: (() => void) | null;
};

type InsertFn = (position: string, child: FakeElement) => FakeElement;

/** document 的「子节点」：临时层按插入位次落在这里，互斥与清理都靠它观察 */
let docChildren: FakeElement[] = [];

let original: FakeOriginal & { insertAdjacentElement: InsertFn };
let created: FakeElement[];
/** createElement / insertAdjacentElement 是否要抛错（模拟受限环境） */
let setupFails: "create" | "insert" | null = null;
/** getComputedStyle 返回的那个「原图层计算值」表 */
let computedValues: Record<string, string> = ORIGINAL_STYLE;

/**
 * 提交阶段的上限（`COMMIT_TIMEOUT_MS`，`wallpaper-crossfade.ts` 里未导出）。
 * 这里的数值与生产常量一一对应；改了生产常量，这条用例会因「没登记到计时器」而红。
 */
const COMMIT_TIMEOUT_MS = 1500;

/**
 * 被捕获的长计时器（按 delay 登记）：提交阶段的 1.5s 上限靠它驱动。
 *
 * 为什么需要捕获：`waitForImage` 的上限是**唯一**能让「解码被拒且图片始终没加载」
 * 这条路径收尾的东西，不驱动它就等于没测过超时。淡入兜底计时器是 720ms，
 * 落在阈值以下照常走真实计时器，不会被截住。
 */
let capturedTimers: { cb: () => void; delay: number }[] = [];

/** 真定时器：模块加载时取一次，重复包裹会把「已被替换的」当成真身再包一层 */
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;

/** 触发提交阶段的 1.5s 上限计时器 */
function fireCommitTimeout(): void {
	const timer = capturedTimers.find((t) => t.delay === COMMIT_TIMEOUT_MS);
	if (!timer) {
		throw new Error("没有登记到提交阶段的 1.5s 上限计时器");
	}
	capturedTimers = capturedTimers.filter((t) => t !== timer);
	timer.cb();
}

function makeOriginal(): FakeOriginal & { insertAdjacentElement: InsertFn } {
	const base = makeElement("img") as unknown as FakeOriginal & {
		insertAdjacentElement: InsertFn;
	};
	base.src = OLD_URL;
	base.complete = true;
	base.naturalWidth = 1920;
	base.decode = () => Promise.resolve();
	base.onSrcSet = null;
	// src 是个访问器：写进去就模拟一次浏览器开始加载
	let value = OLD_URL;
	Object.defineProperty(base, "src", {
		get: () => value,
		set: (next: string) => {
			value = next;
			base.complete = false;
			base.naturalWidth = 0;
			base.onSrcSet?.();
		},
	});
	base.insertAdjacentElement = (
		position: string,
		child: FakeElement,
	): FakeElement => {
		if (setupFails === "insert") throw new Error("cannot insert");
		assert.equal(position, "afterend", "临时层必须插在原图层之后");
		const at = docChildren.indexOf(base);
		docChildren.splice(at + 1, 0, child);
		return child;
	};
	return base;
}

beforeEach(() => {
	docChildren = [];
	created = [];
	setupFails = null;
	computedValues = ORIGINAL_STYLE;
	capturedTimers = [];

	original = makeOriginal();
	// 原图层自己先挂在 document 上，临时层才有「插在它之后」可言
	docChildren.push(original);

	const g = globalThis as unknown as Record<string, unknown>;
	g.document = {
		createElement(tag: string) {
			if (setupFails === "create") throw new Error("no DOM for you");
			const el = makeElement(tag);
			created.push(el);
			return el;
		},
	};
	g.getComputedStyle = () => ({
		getPropertyValue: (name: string) => computedValues[name] ?? "",
	});
	g.window = { matchMedia: () => ({ matches: false }) };
	// 长计时器登记而不调度，由测试显式触发；其余照常走真实计时器
	g.setTimeout = ((cb: () => void, delay?: number) => {
		if ((delay ?? 0) >= 1000) {
			capturedTimers.push({ cb, delay: delay ?? 0 });
			return 0 as unknown as ReturnType<typeof setTimeout>;
		}
		return realSetTimeout(cb, delay);
	}) as unknown as typeof setTimeout;
	g.clearTimeout = ((handle: unknown) => {
		if (handle === 0) return;
		realClearTimeout(handle as ReturnType<typeof setTimeout>);
	}) as unknown as typeof clearTimeout;
});

/** 把微任务与一个宏任务清空（不 sleep 固定毫秒） */
async function flush() {
	for (let i = 0; i < 8; i++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	for (let i = 0; i < 8; i++) await Promise.resolve();
}

/** 页面上现存的临时层（按 DOM 位次） */
const tempLayers = () =>
	docChildren.filter((el) => el.className.includes(TEMP_LAYER_CLASS));

/** 派发真实浏览器里「过渡结束」时的事件 */
function endFade() {
	tempLayers()[0]!.dispatch("transitionend", {
		propertyName: "opacity",
	} as TransitionEvent);
}

const asImage = (el: FakeElement) => el as unknown as HTMLImageElement;

// ---- 结构与层叠值 ----

test("临时层复刻原图层的定位、尺寸、裁切与透明度，层叠值与原图层相同", async () => {
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	const layers = tempLayers();
	assert.equal(layers.length, 1, "淡入期间应当有且只有一层临时层");
	const style = layers[0]!.style.props;

	assert.equal(style["position"], "fixed");
	assert.equal(style["top"], "0");
	assert.equal(style["left"], "0");
	assert.equal(
		style["width"],
		"100%",
		"宽度按声明语义铺满，不抄解析后的像素",
	);
	assert.equal(style["height"], "100%");
	assert.equal(style["object-fit"], "cover", "裁切语义必须照抄原图层");
	assert.equal(style["object-position"], "center");
	assert.equal(style["opacity"], "1", "目标透明度取原图层的计算值");

	// 层叠值是本票的核心：同值才靠 DOM 位次压住旧图，高出遮罩就会顶掉一帧
	assert.equal(
		style["z-index"],
		ORIGINAL_STYLE["z-index"],
		"临时层的层叠值必须与原图层相同",
	);
	assert.ok(
		Number(style["z-index"]) < -998,
		"临时层不得高过纹理遮罩层（.bg-image-pattern 为 -998）",
	);

	endFade();
	await flush();
	await done;
});

test("单向淡入：插入的瞬间是全透明，随后才抬到目标透明度", async () => {
	let opacityAtInsert = "";
	const originalInsert = original.insertAdjacentElement;
	original.insertAdjacentElement = (position: string, child: FakeElement) => {
		opacityAtInsert = child.style.props["opacity"] ?? "";
		return originalInsert(position, child);
	};

	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	assert.equal(
		opacityAtInsert,
		"0",
		"插入的瞬间必须是全透明，否则等于硬切而不是淡入",
	);
	assert.equal(
		tempLayers()[0]!.style.props["opacity"],
		"1",
		"随后抬到目标值才会触发过渡",
	);

	endFade();
	await flush();
	await done;
});

test("临时层压住旧图靠 DOM 位次：正好插在原图层之后", async () => {
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	const index = docChildren.findIndex((el) =>
		el.className.includes(TEMP_LAYER_CLASS),
	);
	assert.equal(
		index,
		docChildren.indexOf(original) + 1,
		"同层叠值时后出现的元素在上，所以必须紧跟原图层之后",
	);

	endFade();
	await flush();
	await done;
});

// ---- 提交顺序：先淡入，再换原图层，最后撤临时层 ----

test("过渡结束后才提交原图层，且临时层被移除", async () => {
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	assert.equal(original.src, OLD_URL, "淡入完成前不得改动原图层的地址");
	assert.equal(tempLayers().length, 1);

	endFade();
	await flush();

	assert.equal(original.src, NEW_URL, "淡入结束后才把新地址落到原图层");
	assert.equal(tempLayers().length, 0, "提交完成后临时层必须被移除");
	assert.equal(await done, "committed");
});

test("原图层全程不留空地址：只在提交那一刻从旧图换到新图", async () => {
	const seen: string[] = [];
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	seen.push(original.src);
	endFade();
	await flush();
	seen.push(original.src);

	assert.deepEqual(seen, [OLD_URL, NEW_URL], "中间不存在先清空再填的地址");
	assert.ok(
		seen.every((value) => value !== ""),
		"任何时刻都不能让背景层落到空地址（那会闪白）",
	);
	await done;
});

// ---- 互斥 ----

test("同一时刻只有一个临时层：第二笔把第一笔收掉，不并存", async () => {
	const first = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	assert.equal(tempLayers().length, 1);

	const second = crossfadeBackground(
		asImage(original),
		"https://example.test/images/bg/c.jpg",
	);
	await flush();

	assert.equal(tempLayers().length, 1, "任何时刻都不许同时存在两层临时层");
	assert.equal(await first, "cancelled", "被挤掉的那一笔应报「已取消」");
	assert.equal(original.src, OLD_URL, "被挤掉的一笔不得提交背景");

	endFade();
	await flush();
	assert.equal(tempLayers().length, 0);
	assert.equal(original.src, "https://example.test/images/bg/c.jpg");
	assert.equal(await second, "committed");
});

test("三笔连发之后最多只剩一层，全部收尾后清零", async () => {
	const results = [
		crossfadeBackground(asImage(original), `${NEW_URL}?1`),
		crossfadeBackground(asImage(original), `${NEW_URL}?2`),
		crossfadeBackground(asImage(original), `${NEW_URL}?3`),
	];
	await flush();
	assert.equal(tempLayers().length, 1, "连发也只允许一层");

	endFade();
	await flush();

	assert.equal(tempLayers().length, 0);
	assert.deepEqual(await Promise.all(results), [
		"cancelled",
		"cancelled",
		"committed",
	]);
});

test("上一笔提交期间又起一笔：第二笔等第一笔落定，全程不超过一层", async () => {
	const first = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	// 第一笔已进入提交阶段（等原图层可画），此时再起第二笔
	const second = crossfadeBackground(
		asImage(original),
		"https://example.test/images/bg/c.jpg",
	);
	await flush();

	assert.equal(
		await first,
		"committed",
		"已进入提交的一笔不回滚——回滚会把画面拉回旧图，是一次可见跳变",
	);
	assert.ok(tempLayers().length <= 1, "层数不得超过一");

	endFade();
	await flush();
	assert.equal(tempLayers().length, 0);
	assert.equal(await second, "committed");
	assert.equal(original.src, "https://example.test/images/bg/c.jpg");
});

// ---- 异常与降级 ----

test("临时层建不起来时报告跳过并让调用方退化（不留半成品）", async () => {
	setupFails = "create";
	const result = await crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	assert.equal(result, "skipped");
	assert.equal(tempLayers().length, 0);
	assert.equal(original.src, OLD_URL, "降级路径不得擅自动原图层");
});

test("插入失败时也不留半成品临时层", async () => {
	setupFails = "insert";
	const result = await crossfadeBackground(asImage(original), NEW_URL);
	await flush();

	assert.equal(result, "skipped");
	assert.equal(tempLayers().length, 0);
	assert.equal(created.length, 1);
	assert.equal(
		created[0]!.removed,
		true,
		"建好却没插进去的那一层也必须被移除",
	);
});

test("提交失败（解码被拒 + 加载报错）：回滚原图层并移除临时层", async () => {
	original.decode = () => Promise.reject(new Error("decode rejected"));
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	assert.equal(tempLayers().length, 1);

	endFade();
	await flush();

	assert.equal(
		tempLayers().length,
		1,
		"原图尚未就绪前不许撤掉临时层（撤了就露底色）",
	);
	assert.equal(original.src, NEW_URL, "此刻原图层已指向新地址、但还没画出来");

	original.naturalWidth = 0;
	original.complete = true;
	original.dispatch("error", undefined);
	await flush();

	assert.equal(await done, "failed");
	assert.equal(tempLayers().length, 0, "失败路径同样必须移除临时层");
	assert.equal(original.src, OLD_URL, "提交失败要回滚，背景保持原样");
});

test("解码被拒但加载完成且有固有尺寸：仍算提交成功（复用 T2 的退化判据）", async () => {
	original.decode = () => Promise.reject(new Error("decode rejected"));
	// 写入 src 后立即具备 complete + naturalWidth（缓存命中时的真实形态）
	original.onSrcSet = () => {
		original.complete = true;
		original.naturalWidth = 1920;
	};

	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	assert.equal(await done, "committed");
	assert.equal(original.src, NEW_URL);
	assert.equal(tempLayers().length, 0);
});

// ---- 减少动态 ----

test("减少动态：不建临时层，直接切换（spec 故事 40）", async () => {
	const g = globalThis as unknown as Record<string, unknown>;
	g.window = { matchMedia: () => ({ matches: true }) };

	const result = await crossfadeBackground(asImage(original), NEW_URL);

	assert.equal(result, "committed");
	assert.equal(original.src, NEW_URL);
	assert.equal(tempLayers().length, 0, "减少动态下不播交叉淡入");
	assert.equal(created.length, 0, "不建任何临时层");
});

test("减少动态是每次调用即时查询：会话中途打开偏好，下一笔立即不再建层", async () => {
	// 第一笔：偏好关闭，正常淡入并提交
	const first = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	assert.equal(tempLayers().length, 1);
	endFade();
	await flush();
	assert.equal(await first, "committed");

	// 用户中途改了系统设置：不重新初始化、不重新加载页面
	const g = globalThis as unknown as Record<string, unknown>;
	g.window = { matchMedia: () => ({ matches: true }) };

	const third = "https://example.test/images/bg/c.jpg";
	const second = await crossfadeBackground(asImage(original), third);

	assert.equal(second, "committed");
	assert.equal(original.src, third, "减少动态下直接换地址");
	assert.equal(
		tempLayers().length,
		0,
		"判定若被缓存（模块级常量 / 一次性闭包），这里会重新建层",
	);
});

test("减少动态下直接切换不依赖临时层：原图层一次就落到新地址", async () => {
	const g = globalThis as unknown as Record<string, unknown>;
	g.window = { matchMedia: () => ({ matches: true }) };
	const seen: string[] = [];
	const originalInsert = original.insertAdjacentElement;
	original.insertAdjacentElement = (position: string, child: FakeElement) => {
		seen.push("insert");
		return originalInsert(position, child);
	};

	const result = await crossfadeBackground(asImage(original), NEW_URL);

	assert.equal(result, "committed");
	assert.deepEqual(seen, [], "没有临时层就没有插入动作");
	assert.equal(original.src, NEW_URL);
});

// ---- 可画判定行为矩阵（Phase F5.1） ----
//
// 缝隙：`commitOriginal` / `waitForImage` 这条提交事务的结算知识——decode 什么时候问、
// 什么时候算可画、什么时候只结算一次、结算后要把什么清掉。行号与
// `output/architecture-2026-11-10/F5.1/behavior-matrix.md` 一一对应。
//
// 这几条用例只看「原图层什么时候算可画、失败怎么回滚、迟到的事件会不会翻案」；
// 临时层的建层与互斥由上面的用例负责。

/** 让提交事务走「解码被拒 → 等 load 事件」那条路 */
function rejectDecode(): void {
	original.decode = () => Promise.reject(new Error("decode rejected"));
}

/** 把原图层置成「已完成且有固有尺寸」并派发 load */
function deliverLoad(): void {
	original.complete = true;
	original.naturalWidth = 1920;
	original.dispatch("load", undefined);
}

test("矩阵 #3：解码被拒后靠 load 事件判定可画", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	assert.equal(
		tempLayers().length,
		1,
		"原图层还没画出来时不得撤掉临时层（撤了就露底色）",
	);

	deliverLoad();
	await flush();

	assert.equal(await done, "committed");
	assert.equal(original.src, NEW_URL);
	assert.equal(tempLayers().length, 0);
});

test("矩阵 #5：提交阶段 1.5s 到点判失败，原图层回滚", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();
	assert.equal(original.src, NEW_URL, "提交阶段已经把新地址写上去了");

	fireCommitTimeout();
	await flush();

	assert.equal(await done, "failed");
	assert.equal(original.src, OLD_URL, "超时判失败要回滚");
	assert.equal(tempLayers().length, 0, "失败路径同样要移除临时层");
});

test("矩阵 #6：超时之后才到的 load 不得把失败翻成成功", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	fireCommitTimeout();
	await flush();
	assert.equal(await done, "failed");

	deliverLoad();
	await flush();

	assert.equal(await done, "failed", "迟到的 load 不得翻案");
	assert.equal(original.src, OLD_URL, "背景仍应是回滚后的旧地址");
});

test("矩阵 #7：提交成功之后才到的 error 不得把成功翻成失败", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	deliverLoad();
	await flush();
	assert.equal(await done, "committed");

	original.complete = true;
	original.naturalWidth = 0;
	original.dispatch("error", undefined);
	await flush();

	assert.equal(await done, "committed", "迟到的 error 不得翻案");
	assert.equal(original.src, NEW_URL);
});

test("矩阵 #8：load 与 error 先后到，结果只由第一次结算决定", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	// 真实浏览器里 load 与 error 互斥；这里连发是为了钉住「只结算一次」
	deliverLoad();
	original.complete = true;
	original.naturalWidth = 0;
	original.dispatch("error", undefined);
	await flush();

	assert.equal(await done, "committed", "后到的信号不得把第一次结算翻掉");
	assert.equal(original.src, NEW_URL);
});

test("矩阵 #9：结算之后 load/error 监听被摘掉", async () => {
	rejectDecode();
	const done = crossfadeBackground(asImage(original), NEW_URL);
	await flush();
	endFade();
	await flush();

	assert.equal(
		original.listenerCount("load"),
		1,
		"提交阶段应当挂着 load 监听",
	);
	assert.equal(
		original.listenerCount("error"),
		1,
		"提交阶段应当挂着 error 监听",
	);

	deliverLoad();
	await flush();

	assert.equal(
		original.listenerCount("load"),
		0,
		"结算后不得再留着监听，否则迟到的事件还会打到已定案的结局上",
	);
	assert.equal(original.listenerCount("error"), 0);
	await done;
});
