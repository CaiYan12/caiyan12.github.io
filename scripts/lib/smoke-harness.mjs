// 冒烟测试台（缝隙 A 与其三套同族脚本共用的台子）。
//
// 为什么存在：check() 此前有四份实现、外加两份 QA 脚本共六种方言，其中
// nice-books-geometry-qa.mjs 的签名是 check(ok, message)——与其余的
// check(name, ok, detail) **参数顺序相反**，把一行判据从一套 smoke 复制到另一套
// 会静默错位（ok 收到一个非空字符串，于是永远 PASS）。console 采集、「外部服务
// 不计 FAIL」的判定、汇总与退出码也各写一遍，且已经漂了：同一个
// NICE_BOOKS_BASE_URL 有三处不同默认值。
//
// 台子只管台子的事：登记判据、采集报错、汇总退出。**判据本身、导航、像素比对
// 助手都留在各 smoke 里**，且刻意不反转控制——各脚本仍是自己 launch、自己导航、
// 自己关浏览器的线性脚本，迁移只是把重复实现换成 import。
//
// 启动参数默认 headless。注意：涉及滚动条宽度、position:fixed 包含块、
// `scrollbar-gutter` 一类的判据必须在真实浏览器里量——headless Chromium 走
// overlay 滚动条（innerWidth === clientWidth），会把这类缺陷整个量成 0。
// 那种场合由调用点传 { headless: false, channel: "msedge" }。
import { chromium } from "playwright";

/**
 * @param {object}   options
 * @param {string}   options.envVar      该套 smoke 的 base URL 环境变量名
 * @param {string}   options.defaultBase 未设环境变量时的默认值（各点自述，台子不统一端口）
 * @param {(info: {url: string, text: string, base: string}) => boolean} [options.isNoise]
 *                「这条报错不该算失败」的策略。台子不预设清单——放行名单是缺陷的藏身处，
 *                每一条都必须写在调用点上、可被读到。
 * @param {object}   [options.launch]    chromium.launch() 的注入参数
 */
export function makeHarness({
	envVar,
	defaultBase,
	isNoise = () => false,
	launch = {},
}) {
	const base = process.env[envVar] ?? defaultBase;
	// 形态回显：AGENTS.md 记过三次踩坑——FANCY_BASE_URL 要站点根，
	// NICE_BOOKS_BASE_URL / AI_NEWS_BASE_URL 要完整页面地址，传错表现为「选择器等不到」的假失败。
	const shape = /\/$/.test(base) ? "完整页面/目录地址" : "站点根";
	console.log(`[smoke] ${envVar}=${base}（形态：${shape}）`);

	const results = [];

	/** 登记一条判据。extra 预留位（design-qa 那类需要附结构化数据时用），本批不消费 */
	function check(name, ok, detail = "", extra = undefined) {
		results.push({ name, ok, extra });
		console.log(
			`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`,
		);
	}

	/**
	 * 一个报错汇：attach(page) 之后该页的 pageerror / console.error 按策略过滤后入列。
	 * 多页面场景（如离线快照另开一页）可另建一个汇，各自带更严或更宽的噪声策略；
	 * 每个汇自带 checkClean 游标，互不吞报错。
	 */
	function createSink({ name = "main", sinkNoise = null } = {}) {
		const errors = [];
		const noise = sinkNoise ?? isNoise;
		// 游标按汇各存一份：若所有汇共用一个整数，A 汇先收 5 条、再查 B 汇时，
		// B 的前 5 条会被当成「上一段已报过」而漏掉。
		let seen = 0;
		function attach(page) {
			page.on("pageerror", (e) => {
				const message = String(e.message ?? e);
				if (noise({ url: "", text: message, base })) return;
				errors.push(message.slice(0, 140));
			});
			page.on("console", (m) => {
				if (m.type() !== "error") return;
				const text = m.text();
				const url = m.location()?.url || "";
				if (noise({ url, text, base })) return;
				errors.push(
					`${text.slice(0, 90)} @ ${url.slice(base.length) || "?"}`,
				);
			});
			return page;
		}
		/**
		 * 按票归属：全程只在最后报一次会把前面某票的报错算到最后一票头上。
		 * 只报这一段新出现的报错，报完把游标推到自己列表末尾。
		 */
		function checkClean(label) {
			const fresh = errors.slice(seen);
			seen = errors.length;
			check(
				`${label}：无本地 console / page 报错`,
				fresh.length === 0,
				fresh.slice(0, 2).join(" | "),
			);
		}
		return { name, errors, attach, checkClean };
	}

	const mainSink = createSink();

	/** 默认查主汇；多页面场景传第二个参数查对应汇（游标各走各的） */
	function checkClean(label, sink = mainSink) {
		sink.checkClean(label);
	}

	function summary() {
		const failed = results.filter((r) => !r.ok);
		return { total: results.length, failed, ok: failed.length === 0 };
	}

	/**
	 * 四套 smoke 共同的汇总口径：只按判据成败决定退出码——
	 * 报错是否算失败由各 smoke 自己的 checkClean 判据决定，这里不重复计。
	 */
	function finish() {
		const { total, failed } = summary();
		console.log(`\n合计 ${total} 项，失败 ${failed.length} 项`);
		if (failed.length) failed.forEach((f) => console.log("  -", f.name));
		process.exit(failed.length ? 1 : 0);
	}

	return {
		base,
		launch,
		browser: chromium,
		check,
		checkClean,
		createSink,
		sink: mainSink,
		errors: mainSink.errors,
		attach: mainSink.attach,
		summary,
		finish,
	};
}
