// 颜色等价判定：把两种颜色表示换算到同一空间后比较。
//
// 为什么需要它：Tailwind v3 的调色板是十六进制（`#374151`），v4 换成了 oklch
// （`oklch(37.3% .034 259.733)`）。同一个颜色在两版里被浏览器序列化成不同字面量，
// 逐条比对时每个用到该 token 的元素都算一条「差异」，而实际渲染出来的像素
// 只差 1 个色阶（8bit 通道），肉眼不可辨。
//
// 这类差异必须单独归类，不能混进「影响渲染」也不能混进「不渲染」：
// 它**确实参与了渲染**，只是渲染结果在可辨阈值内相同。
//
// 判定用 CIE76 色差 ΔE：Lab 空间里的欧氏距离。ΔE < 1 远低于肉眼可辨阈值
// （一般取 2.3 为 JND），因此 ≤ 1 判为「等价色」是保守的。

/**
 * 判定为「等价色」的色差上限。
 *
 * 取 2（ΔE76）：CIE76 的「刚可察觉差」(JND) 约 2.3，取 2 略严于它。
 * 为什么不是 1：Tailwind v3 的 `#374151` 与 v4 的 `oklch(37.3% .034 259.733)`
 * 换算后是 rgb(55,65,81) 与 rgb(54,65,83) —— 8bit 通道上只差 1~2 个色阶，
 * 实测 ΔE ≈ 1.32。按 1 判会把「同一个颜色换了写法」误报成可见回归，
 * 而 8bit 上差 1 个色阶对文字与填充都不可辨。
 * 为什么不能更松：ΔE 2 以上已有可见差别，再松就等于放过真回归。
 */
export const EQUIVALENT_DELTA_E = 2;

/** 把 sRGB 通道值（0..255）转成线性 sRGB。 */
function srgbToLinear(c) {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** 把线性 sRGB 转回 0..255 通道值（带 gamut 裁剪）。 */
function linearToSrgb(v) {
	const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
	return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

/** 线性 sRGB -> CIE XYZ（D65）。 */
function linearSrgbToXyz(r, g, b) {
	return [
		0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b,
		0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b,
		0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b,
	];
}

/** CIE XYZ -> CIE Lab（D65 白点）。 */
function xyzToLab(x, y, z) {
	const f = (t) =>
		t > 216 / 24389 ? Math.cbrt(t) : t / (24389 / 27) / 116 + 16 / 116;
	const fx = f(x / 0.95047),
		fy = f(y / 1.0),
		fz = f(z / 1.08883);
	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** sRGB（0..255）-> CIE Lab。 */
export function srgbToLab(r, g, b) {
	return xyzToLab(
		...linearSrgbToXyz(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)),
	);
}

/** OKLCh -> 线性 sRGB（未裁剪，裁剪在函数出口做）。 */
function oklchToLinearSrgb(L, C, hDeg) {
	const h = (hDeg * Math.PI) / 180;
	const a = C * Math.cos(h);
	const bb = C * Math.sin(h);
	const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
	const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
	const l = l_ ** 3,
		m = m_ ** 3,
		s = s_ ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

/**
 * 解析一个 CSS 颜色值，返回 { r, g, b, a } 或 null。
 *
 * 支持：#rgb / #rrggbb / #rrggbbaa、rgb()/rgba()（数字或百分比）、
 * oklch()/oklab()、以及 `transparent`。其它记法（hsl、color()、颜色名）不解析，
 * 返回 null —— 判不了就说判不了，不猜。
 */
export function parseColor(value) {
	if (!value) return null;
	const s = String(value).trim().toLowerCase();
	if (!s || s === "none") return null;
	if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

	if (s.startsWith("#")) {
		const hex = s.slice(1);
		const expand = (c) => Number.parseInt(c + c, 16);
		if (hex.length === 3 || hex.length === 4) {
			const r = expand(hex[0]),
				g = expand(hex[1]),
				b = expand(hex[2]);
			const a = hex.length === 4 ? expand(hex[3]) / 255 : 1;
			return { r, g, b, a };
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = Number.parseInt(hex.slice(0, 2), 16),
				g = Number.parseInt(hex.slice(2, 4), 16),
				b = Number.parseInt(hex.slice(4, 6), 16);
			const a =
				hex.length === 8
					? Number.parseInt(hex.slice(6, 8), 16) / 255
					: 1;
			return { r, g, b, a };
		}
		return null;
	}

	const fn = /^([a-z-]+)\(([^)]*)\)$/.exec(s);
	if (!fn) return null;
	const name = fn[1];
	const parts = fn[2]
		.split(/[\s,/]+/)
		.map((x) => x.trim())
		.filter(Boolean);
	const num = (t, scale) => {
		if (t === undefined) return null;
		if (t.endsWith("%")) return (Number.parseFloat(t) / 100) * scale;
		return Number.parseFloat(t);
	};

	if (name === "rgb" || name === "rgba") {
		const r = num(parts[0], 255),
			g = num(parts[1], 255),
			b = num(parts[2], 255);
		if (r === null || g === null || b === null) return null;
		const a = parts[3] === undefined ? 1 : num(parts[3], 1);
		return {
			r: Math.round(Math.min(255, Math.max(0, r))),
			g: Math.round(Math.min(255, Math.max(0, g))),
			b: Math.round(Math.min(255, Math.max(0, b))),
			a: a === null ? 1 : Math.min(1, Math.max(0, a)),
		};
	}

	if (name === "oklch") {
		const L = num(parts[0], 1),
			C = num(parts[1], 0.4),
			H = num(parts[2], 360);
		if (L === null || C === null || H === null) return null;
		const a = parts[3] === undefined ? 1 : num(parts[3], 1);
		const lin = oklchToLinearSrgb(L, C, H);
		return {
			r: linearToSrgb(lin[0]),
			g: linearToSrgb(lin[1]),
			b: linearToSrgb(lin[2]),
			a: a === null ? 1 : a,
		};
	}

	return null;
}

/**
 * 两个 CSS 颜色值是否在肉眼不可辨的范围内相等。
 *
 * @returns {{ equivalent: boolean, deltaE: number | null }}
 *   deltaE 为 null 表示「至少有一侧解析不了」，此时不做等价判定。
 */
export function compareColors(valueA, valueB, threshold = EQUIVALENT_DELTA_E) {
	const a = parseColor(valueA);
	const b = parseColor(valueB);
	if (!a || !b) return { equivalent: false, deltaE: null };
	// 透明度不同：半透明与不透明不是同一个颜色，即使 RGB 相同
	if (Math.abs(a.a - b.a) > 1 / 255)
		return { equivalent: false, deltaE: null };
	const labA = srgbToLab(a.r, a.g, a.b);
	const labB = srgbToLab(b.r, b.g, b.b);
	const deltaE = Math.hypot(
		labA[0] - labB[0],
		labA[1] - labB[1],
		labA[2] - labB[2],
	);
	return { equivalent: deltaE < threshold, deltaE };
}
