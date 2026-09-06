/** Nice Books 书籍领域类型（契约字段，与 design-handoff.md §12.1 一致；禁加 rating/review/price/user 等字段） */

export interface FirstEdition {
	year: number;
	edition: string;
}

export interface Book {
	/** 藏书编号，两位数字符串；URL 为 /books/:id/ */
	id: string;
	title: string;
	/** 多作者；译者/续者/笔录者以「xx 译」等形式并入，不得退化为单字符串 */
	author: string[];
	publisher: string;
	firstEdition: FirstEdition;
	/** 本地封面路径（如 /books/covers/01.jpg）；null 时使用程序化 SVG 书封兜底 */
	coverUrl: string | null;
	/** 内容简介（客观描述，与荐语文体区分） */
	description: string;
	/** 站长荐语（第一人称短句，非评论/评分） */
	recommendationReason: string;
	tags: string[];
	/** true → 进入「站长推荐」池 */
	featured: boolean;
}
