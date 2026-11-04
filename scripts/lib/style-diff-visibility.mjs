// 样式指纹差异的可见性判定。
//
// 为什么独立成模块：判定规则要能被单测钉住（`node --test`），而不是只能在一次
// 23 页采集后靠肉眼看输出。规则本身只有几条，但每条都对应一类**会咬人的误判**：
// 把「不渲染的差异」当成回归，会让人去改本来正确的样式；反过来把真回归当成
// 「不渲染」放过去，等于把这道门禁废掉。
//
// 术语：
//   · 可见     = 访客在页面上真的能看出来的变化（影响渲染且肉眼可辨）。
//   · 等价色   = 计算样式变了、也参与渲染，但换算后像素差在肉眼阈值内
//                （典型：v3 的 #374151 与 v4 的 oklch(37.3% .034 259.733) 只差 1 色阶）。
//   · 不可见   = 计算样式变了，但渲染结果不变（不渲染）。
//
// 判定只依据「浏览器自己算出来的值」，不读 CSS 源文本，也不手写 fixture ——
// 手写 fixture 测出来的规则生效与否曾经误报过一次假回归（见 docs/agents/commands.md）。

/** 采集期写入的样式串里，`prop=value` 之间的分隔符。 */
const PROP_SEP = ";";

/**
 * 把一段样式串解析成 { prop: value }。
 * 采集期的样式串格式是 `prop=value;prop=value;...`（见 upgrade-style-audit.mjs 的 pickR）。
 * 伪元素段以 `::before;` / `::after;` 开头，那一段前缀会被当成一个无值属性，忽略即可。
 */
export function parseStyleSegment(segment) {
	const props = new Map();
	if (!segment) return props;
	for (const kv of segment.split(PROP_SEP)) {
		if (!kv) continue;
		const i = kv.indexOf("=");
		if (i === -1) continue;
		props.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
	}
	return props;
}

/* ------------------------------------------------------------------ *
 * 几何属性：这些属性的变化会改变元素的盒子。
 * ------------------------------------------------------------------ */
const GEOMETRY_PROPS = new Set([
	"width",
	"height",
	"min-width",
	"max-width",
	"min-height",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"gap",
]);

/* ------------------------------------------------------------------ *
 * 独立变换属性（CSS Transforms Level 2）
 * ------------------------------------------------------------------ */

/** 解析 2D 矩阵串 `matrix(a, b, c, d, e, f)`。 */
export function parseMatrix(value) {
	if (!value || value === "none") return null;
	const m = /^matrix\(([^)]*)\)$/.exec(value.trim());
	if (!m) return null;
	const nums = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
	if (nums.length !== 6 || nums.some((n) => !Number.isFinite(n))) return null;
	return nums;
}

/** 解析角度串（`10deg` / `0.1rad` / `0.5turn`）。 */
function parseAngle(value) {
	if (!value || value === "none") return null;
	const m = /^(-?[\d.]+)(deg|rad|turn|grad)$/.exec(value.trim());
	if (!m) return null;
	const n = Number.parseFloat(m[1]);
	if (!Number.isFinite(n)) return null;
	switch (m[2]) {
		case "deg":
			return n;
		case "rad":
			return (n * 180) / Math.PI;
		case "turn":
			return n * 360;
		case "grad":
			return (n * 360) / 400;
		default:
			return null;
	}
}

/** 解析 translate 属性（`none` / `10px` / `10px 20px`）。 */
export function parseTranslate(value) {
	if (!value || value === "none") return [0, 0];
	const parts = value.trim().split(/\s+/);
	const px = parts.map((p) => {
		const n = Number.parseFloat(p);
		return Number.isFinite(n) ? n : null;
	});
	if (px.length < 1 || px[0] === null) return null;
	return [px[0], px.length > 1 && px[1] !== null ? px[1] : 0];
}

/** 解析 rotate 属性（`none` / `10deg`）。 */
export function parseRotate(value) {
	if (!value || value === "none") return 0;
	const a = parseAngle(value);
	return a === null ? null : a;
}

/** 解析 scale 属性（`none` / `2` / `2 3`）。 */
export function parseScale(value) {
	if (!value || value === "none") return [1, 1];
	const parts = value.trim().split(/\s+/);
	const nums = parts.map((p) => {
		const n = Number.parseFloat(p);
		return Number.isFinite(n) ? n : null;
	});
	if (nums.length < 1 || nums[0] === null) return null;
	return [nums[0], nums.length > 1 && nums[1] !== null ? nums[1] : nums[0]];
}

/** 2x3 矩阵相乘（m 乘 n，即先应用 n 再应用 m）。 */
function multiply(m, n) {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5],
	];
}

/**
 * 合成元素的**有效**变换矩阵。
 *
 * 为什么必须合成：CSS Transforms Level 2 把 translate / rotate / scale 拆成了三个
 * 独立属性，而 Tailwind v4 的 `rotate-[10deg]`、`-translate-y-[7px]` 用的正是它们。
 * getComputedStyle().transform **只反映 transform 这一个属性**，独立属性不在里面，
 * 于是 v4 的旋转元素在指纹里 transform 读作 "none"——看起来像「变换没了」，
 * 实际渲染一模一样（2026-11-04 实测：v3 matrix(0.984808,...) 与 v4 rotate:10deg
 * 的实际渲染矩形逐位相同）。
 *
 * 合成顺序按规范与实测：M = translate · rotate · scale · transform。
 * 实测依据：translate:5px + rotate:10deg 的合成结果与 transform:translateX(5px) rotate(10deg)
 * 逐位相同（0.984808, 0.173648, -0.173648, 0.984808, 5, 0）。
 *
 * @returns {number[] | null} 6 个数的 2D 矩阵；无法解析时返回 null（调用方须按「不可判定」处理）。
 */
export function composeTransform(props) {
	const t = parseTranslate(props.get("translate"));
	const r = parseRotate(props.get("rotate"));
	const s = parseScale(props.get("scale"));
	const m = parseMatrix(props.get("transform"));
	if (t === null || r === null || s === null) return null;
	if (
		props.get("transform") &&
		props.get("transform") !== "none" &&
		m === null
	)
		return null;
	const rad = (r * Math.PI) / 180;
	const cos = Math.cos(rad),
		sin = Math.sin(rad);
	const T = [1, 0, 0, 1, t[0], t[1]];
	const R = [cos, sin, -sin, cos, 0, 0];
	const S = [s[0], 0, 0, s[1], 0, 0];
	const base = m ?? [1, 0, 0, 1, 0, 0];
	return multiply(multiply(multiply(T, R), S), base);
}

/** 两个合成矩阵是否在 1e-4 内相等（浏览器输出本身只有 6 位有效数字）。 */
function matricesEqual(a, b, eps = 1e-4) {
	if (!a || !b) return false;
	for (let i = 0; i < 6; i++) if (Math.abs(a[i] - b[i]) > eps) return false;
	return true;
}

/* ------------------------------------------------------------------ *
 * 视觉隐藏
 * ------------------------------------------------------------------ */

/**
 * 元素是否被「视觉隐藏」——命中任一即视为隐藏：
 *   · clip-path: inset(50%)（Tailwind v4 的 sr-only 用法）
 *   · clip: rect(0px, 0px, 0px, 0px)（Tailwind v3 / 传统 sr-only 用法）
 *
 * 隐藏元素上的几何变化（宽高、外边距、内边距）不会渲染出来。
 * 2026-11-04 实测：v3 的 sr-only 用 clip + margin:-1px，v4 换成 clip-path + margin:0，
 * 两版都看不见，但计算值确实变了——不判成不可见就会被误报成可见回归。
 */
export function isVisuallyHidden(props) {
	const clipPath = props.get("clip-path");
	if (clipPath) {
		const m = /^inset\(([^)]*)\)$/.exec(clipPath.trim());
		if (m) {
			const parts = m[1].trim().split(/\s+/).filter(Boolean);
			const pct = parts.map((p) =>
				p.endsWith("%") ? Number.parseFloat(p) : null,
			);
			const top = pct[0];
			const right = pct.length >= 4 ? pct[1] : top;
			const bottom = pct.length >= 4 ? pct[2] : top;
			const left =
				pct.length >= 4 ? pct[3] : pct.length >= 3 ? pct[1] : top;
			if (
				[top, right, bottom, left].every((v) => v !== null) &&
				top >= 50 &&
				right >= 50 &&
				bottom >= 50 &&
				left >= 50
			)
				return true;
		}
	}
	const clip = props.get("clip");
	if (
		clip &&
		/^rect\(\s*0px\s*,\s*0px\s*,\s*0px\s*,\s*0px\s*\)$/.test(clip.trim())
	)
		return true;
	return false;
}

/* ------------------------------------------------------------------ *
 * 边框
 * ------------------------------------------------------------------ */

/**
 * 边框颜色在什么条件下才真的渲染。
 *
 * 浏览器规则：边框宽度为 0，或 border-style 为 none/hidden 时，边框不画，颜色不参与渲染。
 * 实测（Chromium）：`border-style:none` 时 getComputedStyle 的 border-*-width 读作 0px，
 * 但反过来不成立——width 为 0px 时 style 仍读 solid。所以判定要**同时**看宽度与样式，
 * 两者取「不渲染」的一票否决。
 */
function borderRenders(props, side) {
	const width = props.get(`border-${side}-width`);
	const style = props.get(`border-${side}-style`);
	const w = Number.parseFloat(width ?? "");
	if (!Number.isFinite(w) || w <= 0) return false;
	// style 未被采集到时不能假定它存在 —— 采集期只取了 border-top-style / border-bottom-style，
	// 左右两侧的 style 不在采集清单里。此时宽度 > 0 是唯一可用的依据，按「会渲染」处理，
	// 宁可多报一条可见差异，也不要把真回归放进不可见堆里。
	if (style === undefined) return true;
	return style !== "none" && style !== "hidden";
}

/* ------------------------------------------------------------------ *
 * box-shadow
 * ------------------------------------------------------------------ */

/** 按顶层逗号切分 box-shadow 的各层（rgb()/rgba() 里的逗号不算）。 */
function splitShadowLayers(value) {
	const layers = [];
	let depth = 0,
		cur = "";
	for (const ch of value) {
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		if (ch === "," && depth === 0) {
			layers.push(cur.trim());
			cur = "";
			continue;
		}
		cur += ch;
	}
	if (cur.trim()) layers.push(cur.trim());
	return layers;
}

/** 一层阴影是否完全不透明（即不画任何东西）。 */
function isTransparentShadow(layer) {
	const m = /rgba?\(([^)]*)\)/.exec(layer);
	if (!m) return false;
	const parts = m[1].split(",").map((s) => s.trim());
	if (parts.length >= 4) {
		const a = Number.parseFloat(parts[3]);
		if (Number.isFinite(a) && a === 0) return true;
	}
	if (parts.length === 3 && /transparent/i.test(parts[2])) return true;
	return false;
}

/**
 * box-shadow 的差异是否不渲染。
 *
 * 全透明的阴影层不画任何东西，多一层少一层都看不见。Tailwind v4 的 Preflight
 * 把 ring/shadow 相关的层拆得更细，实测同一条阴影在两版里的全透明层数量不同
 * （2 层 vs 4 层），但可见的那一层逐字相同。
 */
export function boxShadowRendersSame(from, to) {
	if (!from || !to) return false;
	const visible = (v) =>
		splitShadowLayers(v).filter((l) => !isTransparentShadow(l));
	return visible(from).join(" | ") === visible(to).join(" | ");
}

/* ------------------------------------------------------------------ *
 * border-radius
 * ------------------------------------------------------------------ */

/**
 * 圆角变化是否不渲染。
 *
 * 圆角会被元素自身尺寸钳制：半径 ≥ 一半短边时，渲染出来都是「整圆」。
 * Tailwind v3 的 `rounded-full` 写死 9999px，v4 改成 `calc(infinity * 1px)`，
 * 浏览器算出 3.35544e+07px —— 两者在 42px 的元素上都渲染成同一个整圆。
 */
export function borderRadiusRendersSame(propsA, propsB, from, to) {
	const a = Number.parseFloat(from);
	const b = Number.parseFloat(to);
	if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
	const sizeOf = (props) => {
		const w = Number.parseFloat(props.get("width"));
		const h = Number.parseFloat(props.get("height"));
		if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
		return Math.min(w, h) / 2;
	};
	const sa = sizeOf(propsA);
	const sb = sizeOf(propsB);
	if (sa === null || sb === null) return false;
	const clampedA = Math.min(a, sa);
	const clampedB = Math.min(b, sb);
	return Math.abs(clampedA - clampedB) < 0.5;
}

/* ------------------------------------------------------------------ *
 * 判定入口
 * ------------------------------------------------------------------ */

/**
 * 一条属性差异是否影响渲染。
 *
 * @param {string} prop 属性名，如 "border-top-color"
 * @param {string} from 旧值
 * @param {string} to   新值
 * @param {Map<string,string>} propsA 该元素在旧版本里的计算样式
 * @param {Map<string,string>} propsB 该元素在新版本里的计算样式
 * @returns {{ visible: boolean, reason: string }}
 */
export function judgePropertyDiff(prop, from, to, propsA, propsB) {
	// 边框颜色：宽度为零（样式为 none/hidden）时不渲染。
	// 采集清单里有 border-top-color 与 border-left-color 两条，
	// 它们各自对应 border-top-width / border-left-width，两侧都要查。
	const borderColor = /^border-(top|left|bottom|right)-color$/.exec(prop);
	if (borderColor) {
		const side = borderColor[1];
		const width =
			propsA.get(`border-${side}-width`) ??
			propsB.get(`border-${side}-width`);
		const style =
			propsA.get(`border-${side}-style`) ??
			propsB.get(`border-${side}-style`);
		const renders =
			borderRenders(propsA, side) || borderRenders(propsB, side);
		if (!renders) {
			return {
				visible: false,
				reason: `边框宽度为零或样式为 none，颜色不参与渲染（width=${width ?? "?"}, style=${style ?? "未采集"}）`,
			};
		}
		return {
			visible: true,
			reason: `边框会渲染（width=${width ?? "?"}, style=${style ?? "未采集"}）`,
		};
	}

	// transform 族：必须按「有效变换矩阵」比，不能只比单个属性本身。
	// transform / translate / rotate / scale 四个属性合成的是同一个矩阵，
	// Tailwind v3 用 transform、v4 用独立属性，合成后一致就等于没变。
	if (
		prop === "transform" ||
		prop === "translate" ||
		prop === "rotate" ||
		prop === "scale"
	) {
		const ma = composeTransform(propsA);
		const mb = composeTransform(propsB);
		if (ma && mb) {
			if (matricesEqual(ma, mb))
				return {
					visible: false,
					reason: "有效变换矩阵相同（transform/translate/rotate/scale 合成后一致）",
				};
			return {
				visible: true,
				reason: "有效变换矩阵不同",
			};
		}
		return { visible: true, reason: "变换无法解析，保守按可见处理" };
	}

	// 视觉隐藏元素上的几何变化不渲染。
	if (GEOMETRY_PROPS.has(prop)) {
		if (isVisuallyHidden(propsA) || isVisuallyHidden(propsB))
			return {
				visible: false,
				reason: "元素被视觉隐藏（clip-path/clip），几何变化不渲染",
			};
	}

	// 圆角：钳制后相同就不渲染。
	if (prop === "border-radius") {
		if (borderRadiusRendersSame(propsA, propsB, from, to))
			return {
				visible: false,
				reason: "圆角被元素尺寸钳制后相同（都是整圆）",
			};
		return { visible: true, reason: "圆角渲染结果不同" };
	}

	// 阴影：只看非透明层。
	if (prop === "box-shadow") {
		if (boxShadowRendersSame(from, to))
			return {
				visible: false,
				reason: "只有全透明层数量不同，可见阴影逐字相同",
			};
		return { visible: true, reason: "阴影渲染结果不同" };
	}

	// 视觉隐藏本身：两版都隐藏 → 不可见；一版隐藏一版不隐藏 → 可见。
	if (prop === "clip" || prop === "clip-path") {
		const hiddenA = isVisuallyHidden(propsA);
		const hiddenB = isVisuallyHidden(propsB);
		if (hiddenA && hiddenB)
			return {
				visible: false,
				reason: "两版都把元素裁剪到不可见，隐藏方式不同但效果相同",
			};
		return { visible: true, reason: "元素的可见性发生变化" };
	}

	return { visible: true, reason: "影响渲染的属性" };
}

/**
 * 一份采集结果拆成「按位置路径索引的元素」与「元素内的样式段」。
 * 一行采集数据的格式是 `tag#id.class | 位置路径 | 样式串 [| ::before 段] [| ::after 段]`。
 */
export function splitLine(line) {
	const segs = line.split(" | ");
	const head = segs[0] ?? "";
	const path = segs[1] ?? "";
	return {
		head,
		path,
		// segs[0]=元素标识、segs[1]=位置路径，从 segs[2] 起是样式段
		segments: segs.slice(2),
	};
}

/**
 * 比对两行同位置的元素，返回它们的属性级差异。
 *
 * 只比较**两侧都有**的属性：采集清单随工具版本变过（本次新增 clip / clip-path /
 * translate / rotate / scale），旧采集结果里没有这些属性。若把「一侧缺失」当成差异，
 * 每次改采集清单都会让所有元素凭空多出一条差异。
 *
 * @returns {Array<{ prop: string, from: string, to: string, segment: string }>}
 */
export function diffElementLines(lineA, lineB) {
	const a = splitLine(lineA);
	const b = splitLine(lineB);
	const out = [];
	const n = Math.max(a.segments.length, b.segments.length);
	for (let i = 0; i < n; i++) {
		const segA = a.segments[i] ?? "";
		const segB = b.segments[i] ?? "";
		const mapA = parseStyleSegment(segA);
		const mapB = parseStyleSegment(segB);
		for (const [prop, from] of mapA) {
			if (!mapB.has(prop)) continue;
			const to = mapB.get(prop);
			if (from === to) continue;
			out.push({
				prop,
				from,
				to,
				// 段序号：2 起算（0=元素标识、1=位置路径），伪元素段带 ::before/::after 前缀
				segment: segmentLabel(segA, segB, i),
				propsA: mapA,
				propsB: mapB,
			});
		}
	}
	return out;
}

function segmentLabel(segA, segB, index) {
	const raw = segA || segB || "";
	if (raw.startsWith("::before")) return "::before";
	if (raw.startsWith("::after")) return "::after";
	return index === 0 ? "(元素本身)" : `段${index}`;
}
