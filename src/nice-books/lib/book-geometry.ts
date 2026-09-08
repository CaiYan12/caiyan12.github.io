export type CoverDisplayVariant = "hero" | "card" | "list";

export interface BookGeometry {
	width: number;
	height: number;
	depth: number;
	boardThickness: number;
	boardOverhangX: number;
	boardOverhangY: number;
	pageInsetX: number;
	pageInsetY: number;
	perspective: number;
	rotateX: number;
	rotateY: number;
	rotateZ: number;
	hoverRotateY: number;
	obiY: number;
	obiHeight: number;
}

export const BOOK_GEOMETRY: Record<CoverDisplayVariant, BookGeometry> = {
	hero: {
		width: 200,
		height: 300,
		depth: 24,
		boardThickness: 1.5,
		boardOverhangX: 1,
		boardOverhangY: 1,
		pageInsetX: 1,
		pageInsetY: 1,
		perspective: 1000,
		rotateX: 0,
		rotateY: -25,
		rotateZ: 0,
		hoverRotateY: -32,
		obiY: 55,
		obiHeight: 22,
	},
	card: {
		width: 180,
		height: 270,
		depth: 21,
		boardThickness: 1.25,
		boardOverhangX: 1,
		boardOverhangY: 1,
		pageInsetX: 1,
		pageInsetY: 1,
		perspective: 1000,
		rotateX: 0,
		rotateY: -25,
		rotateZ: 0,
		hoverRotateY: -32,
		obiY: 63,
		obiHeight: 23,
	},
	list: {
		width: 48,
		height: 72,
		depth: 7,
		boardThickness: 0.75,
		boardOverhangX: 0.5,
		boardOverhangY: 0.25,
		pageInsetX: 0.5,
		pageInsetY: 0.25,
		perspective: 1000,
		rotateX: 0,
		rotateY: -25,
		rotateZ: 0,
		hoverRotateY: -30,
		obiY: 60,
		obiHeight: 22,
	},
};

export function geometryStyle(variant: CoverDisplayVariant): string {
	const geometry = BOOK_GEOMETRY[variant];
	return [
		`--book-w:${geometry.width}`,
		`--book-h:${geometry.height}`,
		`--book-depth:${geometry.depth}px`,
		`--board-thickness:${geometry.boardThickness}px`,
		`--board-overhang-x:${geometry.boardOverhangX}px`,
		`--board-overhang-y:${geometry.boardOverhangY}px`,
		`--page-inset-x:${geometry.pageInsetX}px`,
		`--page-inset-y:${geometry.pageInsetY}px`,
		`--book-perspective:${geometry.perspective}px`,
		`--book-rotate-x:${geometry.rotateX}deg`,
		`--book-rotate-y:${geometry.rotateY}deg`,
		`--book-rotate-z:${geometry.rotateZ}deg`,
		`--book-hover-rotate-y:${geometry.hoverRotateY}deg`,
		`--obi-y:${geometry.obiY}%`,
		`--obi-height:${geometry.obiHeight}%`,
	].join(";");
}
