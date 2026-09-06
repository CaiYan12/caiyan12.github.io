/**
 * /books/data.json — 书库客户端过滤的数据源。
 * 不用 DOM 内嵌 JSON：swup 替换 main 时会丢失 script 内容（实测 jsonLen=0），
 * 独立静态端点对整页加载 / swup 切页 / 浏览器缓存全路径健壮。
 */
import type { APIRoute } from "astro";
import { books } from "../../nice-books/data/books";

export const GET: APIRoute = () => {
	return new Response(JSON.stringify(books), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
