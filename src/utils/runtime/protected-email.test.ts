// 邮箱保护解码的单测（T7 #122 迁移时抽出的纯函数核）。
// 期望值来自迁移前 theme-script.ts 的 `initProtectedEmail` 实际读数：
// - rot13 只转 [a-zA-Z]，大小写各自以自己的字母表起点（65 / 97）回绕；
// - 其余一律走 atob，非法载荷吞掉异常并放弃（不拼 mailto）；
// - 缺省 method 是 base64。
// 编码侧对照 src/plugins/rehype-email-protection.mjs 的同款实现。
import test from "node:test";
import assert from "node:assert/strict";
import { decodeProtectedEmail } from "./protected-email";

test("base64 解出原始邮箱", () => {
	assert.deepEqual(decodeProtectedEmail("bW9jay10ZXN0QGV4YW1wbGUuY29t"), {
		ok: true,
		email: "mock-test@example.com",
	});
});

test("rot13 解出原始邮箱，大小写字母表各自回绕", () => {
	assert.deepEqual(decodeProtectedEmail("zbpx-grfg@rknzcyr.pbz", "rot13"), {
		ok: true,
		email: "mock-test@example.com",
	});
	assert.deepEqual(decodeProtectedEmail("N@O.r", "rot13"), {
		ok: true,
		email: "A@B.e",
	});
});

test("rot13 是自逆的：对解出的明文再转一次回到密文", () => {
	const once = decodeProtectedEmail("zbpx-grfg@rknzcyr.pbz", "rot13");
	assert.equal(once.ok, true);
	if (once.ok) {
		assert.deepEqual(decodeProtectedEmail(once.email, "rot13"), {
			ok: true,
			email: "zbpx-grfg@rknzcyr.pbz",
		});
	}
});

test("非法 base64 载荷判失败，不产出 mailto", () => {
	assert.deepEqual(decodeProtectedEmail("不是 base64"), { ok: false });
	assert.deepEqual(decodeProtectedEmail(""), { ok: true, email: "" });
});
