// 行尾形态检测。只判断「同一份文本里有没有混用 CRLF 与裸 LF」。
//
// 为什么不是「强制全仓 CRLF」（2026-11-05 实测）：本仓库 core.autocrlf=true，
// Git blob 统一存 LF；工作区 293 个文本文件里 124 个本来就是纯 LF、0 个混合行尾。
// 强制 CRLF 会让这 124 个文件在正常提交时全部误报。整文件从 CRLF 统一变 LF
// 也不会进入 git diff（blob 仍是 LF），真正会产生差异的是混用。
//
// 本模块是单一真源：pre-commit 钩子、scripts/verify-eol.mjs、单测都从这里取。
export function detectEol(text) {
	let crlf = 0;
	let bareLf = 0;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) !== 10) continue;
		if (i > 0 && text.charCodeAt(i - 1) === 13) crlf++;
		else bareLf++;
	}
	if (crlf > 0 && bareLf > 0) return "mixed";
	if (crlf > 0) return "crlf";
	if (bareLf > 0) return "lf";
	return "none";
}

export function hasMixedEol(text) {
	return detectEol(text) === "mixed";
}
