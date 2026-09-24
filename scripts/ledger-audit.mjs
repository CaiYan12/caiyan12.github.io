// 票册自检：把票册「本文件怎么用」一节写给自身的契约变成可跑的判据。
//
// 规则（R1–R6）：
//   R1 编号票（标题以数字开头）必须有 `> Issue: #NN` 镜像行。
//   R2 每张票恰有一条 `> 状态：` 行，且必须是终态（不得停在「未开始」「进行中」）。
//   R3 不得有未勾选的验收判据（`- [ ]`）——它们是判据，不是待办清单。
//   R4 「已验收」的状态行必须引用 commit sha，且该 sha 必须在 HEAD 的祖先链上。
//   R5 编号票的镜像 issue 必须已关闭（唯一依赖网络与令牌的一条，`--offline` 跳过）。
//   R6 划掉（`~~…~~`）的判据必须写明「作废」——否则 `[x]` 与真达成的勾在机器眼里
//      没有区别，这正是上一轮票册自己造出来的歧义（票 12／20／21／22 各一条）。
//
// R5 的镜像状态读一份 issue 快照，刷新命令（长中文与令牌都不经 argv）：
//   curl -H "Authorization: Bearer $(gh auth token)" \
//     "https://api.github.com/repos/CaiYan12/caiyan12.github.io/issues?state=all&per_page=100" \
//     -o output/ledger-issues.json
//
// 用法：
//   node scripts/ledger-audit.mjs docs/plans/<票册>.md [--issues=<快照>] [--offline]
//   pnpm audit:ledger docs/plans/<票册>.md --offline
//
// 刻意不接进 pnpm build / CI：断网或令牌失效会让构建假红，而票册只在收口期需要自检。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const positional = argv.filter((a) => !a.startsWith("--"));
const OFFLINE = flags.includes("--offline");
const ISSUES =
	flags.find((f) => f.startsWith("--issues="))?.slice("--issues=".length) ??
	"output/ledger-issues.json";
const LEDGER = positional[0];

if (!LEDGER) {
	console.error(
		"用法：node scripts/ledger-audit.mjs <票册.md> [--offline] [--issues=<快照>]",
	);
	process.exit(2);
}

const lines = readFileSync(LEDGER, "utf8").replace(/\r\n/g, "\n").split("\n");

let closed = null;
if (!OFFLINE) {
	if (!existsSync(ISSUES)) {
		console.error(
			`R5 需要 issue 快照，但 ${ISSUES} 不存在。\n` +
				`先刷新（见本文件头注释），或加 --offline 跳过 R5。`,
		);
		process.exit(2);
	}
	const parsed = JSON.parse(readFileSync(ISSUES, "utf8"));
	closed = new Set(
		parsed.filter((i) => i.state === "closed").map((i) => i.number),
	);
}

const shaIsAncestor = (sha) => {
	try {
		execFileSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], {
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
};

const fails = [];
const fail = (rule, where, what) => fails.push(`${rule} | ${where} | ${what}`);

const sections = [];
let cur = null;
lines.forEach((raw, i) => {
	const n = i + 1;
	if (/^### /.test(raw)) {
		cur = {
			title: raw.slice(4),
			n,
			status: [],
			boxes: [],
			done: [],
			issue: null,
		};
		sections.push(cur);
	} else if (/^## /.test(raw)) cur = null;
	if (!cur) return;
	const iss = raw.match(/^> Issue: #(\d+)/);
	if (iss) cur.issue = Number(iss[1]);
	if (/^> 状态：/.test(raw))
		cur.status.push({ n, text: raw.slice(6).trim() });
	if (/^- \[ \]/.test(raw)) cur.boxes.push({ n, text: raw.slice(6).trim() });
	if (/^- \[[xX]\]/.test(raw))
		cur.done.push({ n, text: raw.slice(6).trim() });
});

// 「### T3 前置实测」这类散文子块不是票，状态行契约不适用；
// 上一轮第一版没收敛，把散文段也算成票，虚报 1 条——判据过宽是脚本越界。
const TICKET = /^(\d{1,2}|插-\d+)\./;
for (const s of sections) {
	if (!TICKET.test(s.title)) continue;
	const id = s.title.match(TICKET)[1];
	const at = (n) => `${id}（${LEDGER}:${n}）`;
	if (/^\d/.test(id) && !s.issue) fail("R1 编号票要有镜像", at(s.n), s.title);
	if (s.issue && closed && !closed.has(s.issue))
		fail("R5 镜像要已关闭", at(s.n), `#${s.issue}`);
	if (s.status.length === 0) fail("R2 状态行", at(s.n), "缺失");
	if (s.status.length > 1)
		fail(
			"R2 状态行",
			at(s.status[1].n),
			`同票多条状态行（${s.status.map((x) => x.n).join("/")}），终态无法唯一定位`,
		);
	const st = s.status.at(-1);
	if (st) {
		if (/^(未开始|进行中)/.test(st.text))
			fail("R2 终态", at(st.n), st.text.slice(0, 24));
		const shas = [...st.text.matchAll(/\b[0-9a-f]{7,40}\b/g)].map(
			(m) => m[0],
		);
		if (/^已验收/.test(st.text) && shas.length === 0)
			fail("R4 状态要有 commit", at(st.n), st.text.slice(0, 24));
		for (const sha of shas)
			if (!shaIsAncestor(sha))
				fail("R4 commit 不在 HEAD 链上", at(st.n), sha);
	}
	for (const b of s.boxes) fail("R3 判据未勾", at(b.n), b.text.slice(0, 40));
	for (const { n, text } of s.done)
		if (text.includes("~~") && !text.includes("作废"))
			fail("R6 划掉的判据要写作废", at(n), text.slice(0, 40));
}

for (const f of fails) console.log("FAIL " + f);
const verdict = fails.length
	? "RED"
	: OFFLINE
		? "GREEN（R5 未验：离线）"
		: "GREEN";
console.log(
	`${LEDGER}：${sections.length} 段 / ${fails.length} 条不合规 → ${verdict}`,
);
process.exit(fails.length ? 1 : 0);
