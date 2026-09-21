// 构建期 JSON 产物的统一写出契约（六个生成脚本共享）：
// 序列化仍是 tab 缩进的 JSON.stringify，但最后过一遍 Prettier，
// 使「src 下的跟踪产物符合 prettier --check ./src」成为生产者的不变量，
// 而不是「恰好没有短数组」的运气。选项由 .prettierrc.cjs 解析，避免与
// 仓库格式（useTabs/tabWidth/endOfLine）漂移。
import prettier from "prettier";

export async function formatJson(filePath, data) {
	const config = (await prettier.resolveConfig(filePath)) ?? {};
	return prettier.format(JSON.stringify(data, null, "\t"), {
		...config,
		parser: "json",
		filepath: filePath,
	});
}
