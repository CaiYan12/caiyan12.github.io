// 构建期 JSON 产物的统一写出契约（六个生成脚本共享）：
// 序列化仍是 tab 缩进的 JSON.stringify，但最后过一遍 Prettier，
// 使「src 下的跟踪产物符合 prettier --check ./src」成为生产者的不变量，
// 而不是「恰好没有短数组」的运气。选项由 .prettierrc.cjs 解析，避免与
// 仓库格式（useTabs/tabWidth/endOfLine）漂移。
//
// prettier 必须延迟加载且缺失时降级：deploy.yml 的 "Sync Giscus comments"
// 步骤跑在 pnpm install 之前（node scripts/sync-site-stats.mjs），那时
// node_modules 还不存在。该处产物只写进 runner 工作区、不回提交，
// 排版回落不影响站点内容；本地装了 devDependencies 时仍是 Prettier 排版。
const INDENT = "\t";

export async function formatJson(filePath, data) {
	const plain = JSON.stringify(data, null, INDENT) + "\n";
	let prettier;
	try {
		prettier = await import("prettier");
	} catch {
		return plain;
	}
	const config = (await prettier.resolveConfig(filePath)) ?? {};
	return prettier.format(plain, {
		...config,
		parser: "json",
		filepath: filePath,
	});
}
