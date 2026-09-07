/** Nice Books 书封展示配置：不污染 Book 领域模型。 */
export type CoverFamily = "literary" | "history" | "science" | "essay";

/** 22 本 V1 书籍的固定封面族；未知 ID 由 coverFamilyForId() 退回文学族。 */
export const COVER_FAMILY_BY_ID: Readonly<Record<string, CoverFamily>> = {
	"01": "literary",
	"02": "literary",
	"03": "science",
	"04": "literary",
	"05": "essay",
	"06": "history",
	"07": "literary",
	"08": "essay",
	"09": "essay",
	"10": "literary",
	"11": "literary",
	"12": "literary",
	"13": "essay",
	"14": "history",
	"15": "history",
	"16": "history",
	"17": "science",
	"18": "literary",
	"19": "science",
	"20": "literary",
	"21": "history",
	"22": "essay",
};

export function coverFamilyForId(id: string): CoverFamily {
	return COVER_FAMILY_BY_ID[id] ?? "literary";
}
