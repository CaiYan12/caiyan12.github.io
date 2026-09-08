/**
 * Nice Books V1 数据层（单一真相源）
 * ------------------------------------------------------------
 * 书目为公知信息，版次年份取常见通行版本，仅作排版演示，见
 * design-handoff.md §12.2。V1 fixture 22 本（01–22）迁移自原型
 * prototype/assets/js/data.js，01–70 为扩充后的完整书单。
 *
 * 校验策略（主提示词 §44：build/dev 期尽早失败）：
 * 模块顶层执行断言，任何字段不合法直接抛错 —— dev 启动、astro build（getStaticPaths
 * 导入本模块）、单测三条路径都会立即失败。
 */

import type { Book } from "../types";

const BOOKS: Book[] = [
	{
		id: "01",
		title: "百年孤独",
		author: ["加西亚·马尔克斯", "范晔 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2011, edition: "第一版" },
		coverUrl: null,
		description:
			"布恩迪亚家族七代人的传奇，马孔多小镇百余年的兴衰。魔幻与现实在此交织，孤独如宿命一般笼罩着每一个人。",
		recommendationReason:
			"第一次读完是在大学宿舍，合上书那天窗外正好下大雨。此后每年都会重读一遍，每次都会在新的地方停下来。",
		excerpts: [
			"多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。",
			"过去都是假的，回忆是一条没有归途的路。",
		],
		tags: ["文学", "小说", "外国文学", "经典"],
		featured: true,
	},
	{
		id: "02",
		title: "围城",
		author: ["钱锺书"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1991, edition: "第一版" },
		coverUrl: null,
		description:
			"钱锺书唯一的长篇小说。围在城里的人想逃出来，城外的人想冲进去——婚姻也罢，职业也罢，人生的愿望大都如此。",
		recommendationReason:
			"隔几页就忍不住划一句的奇书。讽刺得刻薄，又刻薄得让人发笑。",
		tags: ["文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "03",
		title: "三体",
		author: ["刘慈欣"],
		publisher: "重庆出版社",
		firstEdition: { year: 2008, edition: "第一版" },
		coverUrl: null,
		description:
			"一次绝密军事项目，让地球文明与三体文明有了第一次接触。一部硬朗、宏大而冷酷的中国科幻史诗。",
		recommendationReason:
			"读完抬头看夜空的心情很难描述。国产科幻天花板，没有之一。",
		excerpts: ["弱小和无知不是生存的障碍，傲慢才是。"],
		tags: ["科幻", "小说"],
		featured: true,
	},
	{
		id: "04",
		title: "活着",
		author: ["余华"],
		publisher: "作家出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"地主少爷福贵嗜赌成性，终于赌光了家业。此后内战、饥荒、动荡接踵而至，身边的亲人一个个离去，而他依旧活着。",
		recommendationReason:
			"薄薄一本，两小时就能读完，但接下来两天会一直想着它。",
		excerpts: [
			"人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。",
		],
		tags: ["文学", "小说"],
		featured: true,
	},
	{
		id: "05",
		title: "小王子",
		author: ["安托万·德·圣埃克苏佩里", "周克希 译"],
		publisher: "华东师范大学出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"飞行员在撒哈拉沙漠遇见了来自 B-612 星球的小王子。一本写给大人的童话，关于玫瑰、狐狸，和眼睛看不见的东西。",
		recommendationReason:
			"周克希的译本味道最对。不同年纪读，是三本不同的书。",
		excerpts: [
			"如果你说你在下午四点来，从三点钟开始，我就开始感觉很快乐。时间越临近，我就越感到快乐。",
		],
		tags: ["文学", "外国文学", "经典"],
		featured: true,
	},
	{
		id: "06",
		title: "万历十五年",
		author: ["黄仁宇"],
		publisher: "生活·读书·新知三联书店",
		firstEdition: { year: 1997, edition: "第一版" },
		coverUrl: null,
		description:
			"以万历十五年这个看似平淡的年份为切口，剖析大明王朝乃至整个传统中国的制度困局。「大历史观」的开山之作。",
		recommendationReason:
			"把历史写得像推理小说。读完再看任何古装剧都会走神去想制度问题。",
		tags: ["历史", "人文", "经典"],
		featured: true,
	},
	{
		id: "07",
		title: "呐喊",
		author: ["鲁迅"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1979, edition: "第一版" },
		coverUrl: null,
		description:
			"《狂人日记》《孔乙己》《阿Q正传》……新文学的第一声呐喊。一百年过去，书里的人仍然住在我们周围。",
		recommendationReason: "小时候背课文觉得他凶，长大重读才发现他最温柔。",
		excerpts: ["其实地上本没有路，走的人多了，也便成了路。"],
		tags: ["文学", "经典", "中国文学"],
		featured: true,
	},
	{
		id: "08",
		title: "边城",
		author: ["沈从文"],
		publisher: "人民文学出版社",
		firstEdition: { year: 2000, edition: "第一版" },
		coverUrl: null,
		description:
			"湘西茶峒的渡船上，翠翠和爷爷安静地生活着。一个关于等待的故事——这个人也许永远不回来了，也许明天回来。",
		recommendationReason: "适合夏天的傍晚读。文字干净得像溪水。",
		excerpts: ["这个人也许永远不回来了，也许明天回来。"],
		tags: ["文学", "小说", "中国文学"],
		featured: false,
	},
	{
		id: "09",
		title: "瓦尔登湖",
		author: ["亨利·戴维·梭罗", "徐迟 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2004, edition: "第一版" },
		coverUrl: null,
		description:
			"1845 年春天，梭罗带着一把斧头走进瓦尔登湖畔的森林，独自生活了两年零两个月。一本关于「如何生活」的实验记录。",
		recommendationReason:
			"焦虑的年头，随便翻开一页都能安静下来。徐迟译本依然是最好的。",
		tags: ["散文", "外国文学", "自然"],
		featured: true,
	},
	{
		id: "10",
		title: "局外人",
		author: ["阿尔贝·加缪", "柳鸣九 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2010, edition: "第一版" },
		coverUrl: null,
		description:
			"默尔索在母亲的葬礼上没有流泪，后来因此被判处死刑。存在主义文学最锋利的一把刀。",
		recommendationReason:
			"很短，一个下午读完。但之后很长一段时间，你会被它盯着看。",
		excerpts: ["今天，妈妈死了。也许是昨天，我不知道。"],
		tags: ["文学", "小说", "外国文学"],
		featured: false,
	},
	{
		id: "11",
		title: "月亮与六便士",
		author: ["毛姆", "傅惟慈 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2009, edition: "第一版" },
		coverUrl: null,
		description:
			"四十岁的伦敦证券经纪人突然抛下一切去了巴黎，理由只有一个：我必须画画。满地都是六便士，他却抬头看见了月亮。",
		recommendationReason: "每次换工作的念头冒出来，就会想起这本书。",
		tags: ["文学", "小说", "外国文学"],
		featured: true,
	},
	{
		id: "12",
		title: "红楼梦",
		author: ["曹雪芹", "高鹗 续"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1996, edition: "第一版" },
		coverUrl: null,
		description:
			"一块顽石、一株绛草，和一整个家族的盛衰。中国小说的绝对巅峰，也是一座读一辈子也读不完的园子。",
		recommendationReason:
			"不必多说。只提醒一句：别从第一回的神话开始较真，先读下去再说。",
		excerpts: ["满纸荒唐言，一把辛酸泪。都云作者痴，谁解其中味？"],
		tags: ["经典", "中国文学", "小说"],
		featured: true,
	},
	{
		id: "13",
		title: "城南旧事",
		author: ["林海音"],
		publisher: "中国青年出版社",
		firstEdition: { year: 2001, edition: "第一版" },
		coverUrl: null,
		description:
			"二十世纪二十年代的北京城南，小英子眼中的骆驼队、惠安馆，和爸爸的花儿落了。旧照片一样的童年。",
		recommendationReason:
			"冬天读会想喝一碗热豆汁儿。告别写得克制，反而最催泪。",
		tags: ["文学", "中国文学", "童年"],
		featured: false,
	},
	{
		id: "14",
		title: "平凡的世界",
		author: ["路遥"],
		publisher: "北京十月文艺出版社",
		firstEdition: { year: 2017, edition: "第一版" },
		coverUrl: null,
		description:
			"黄土高原上，孙少安与孙少平兄弟在时代变迁中各自挣扎、各自生长。一部厚重的中国当代生活全景。",
		recommendationReason:
			"三册很厚，但你会舍不得读完。写给每一个不肯认输的普通人。",
		tags: ["小说", "中国文学", "经典"],
		featured: true,
	},
	{
		id: "15",
		title: "白鹿原",
		author: ["陈忠实"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1993, edition: "第一版" },
		coverUrl: null,
		description:
			"渭河平原上白、鹿两家半个世纪的恩怨纠葛。一幅厚重苍凉的「民族秘史」长卷。",
		recommendationReason: "开篇第一句，就是中文小说里最惊人的开场之一。",
		tags: ["小说", "中国文学", "历史"],
		featured: false,
	},
	{
		id: "16",
		title: "乡土中国",
		author: ["费孝通"],
		publisher: "北京大学出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"差序格局、礼治秩序、无讼……十四篇短文讲透中国基层社会的底层逻辑。理解中国人际关系的必读书。",
		recommendationReason: "写于 1947 年，今天读处处对应现实。薄，且硬核。",
		tags: ["社会学", "人文", "经典"],
		featured: true,
	},
	{
		id: "17",
		title: "人类简史",
		author: ["尤瓦尔·赫拉利", "林俊宏 译"],
		publisher: "中信出版社",
		firstEdition: { year: 2014, edition: "第一版" },
		coverUrl: null,
		description:
			"从认知革命、农业革命到科学革命，一部关于人类如何走到今天的宏大叙事——以及我们对「讲故事」这件事的依赖。",
		recommendationReason: "观点未必都同意，但每次合上都忍不住跟人安利。",
		tags: ["历史", "科普", "人文"],
		featured: true,
	},
	{
		id: "18",
		title: "追风筝的人",
		author: ["卡勒德·胡赛尼", "李继宏 译"],
		publisher: "上海人民出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"阿富汗少爷阿米尔与仆人之子哈桑的友谊与背叛。为你，千千万万遍。",
		recommendationReason: "后半程几乎是一口气读完的。别在地铁上看结尾。",
		tags: ["小说", "外国文学"],
		featured: false,
	},
	{
		id: "19",
		title: "解忧杂货店",
		author: ["东野圭吾", "李盈春 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2014, edition: "第一版" },
		coverUrl: null,
		description:
			"一家可以穿越时空回信的杂货店，几个互相咬合的人生故事。东野圭吾难得的温柔之作。",
		recommendationReason:
			"结构精巧得像钟表。适合心情低落时读，治愈但不说教。",
		tags: ["小说", "外国文学", "治愈"],
		featured: false,
	},
	{
		id: "20",
		title: "霍乱时期的爱情",
		author: ["加西亚·马尔克斯", "杨玲 译"],
		publisher: "南海出版公司",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"一段跨越半个多世纪的爱情，在战争与霍乱之间等待了五十三年七个月零十一天。",
		recommendationReason:
			"如果说《百年孤独》是宿命，这本就是耐心。爱情的所有形态都在里面了。",
		tags: ["文学", "小说", "外国文学"],
		featured: false,
	},
	{
		id: "21",
		title: "文学回忆录",
		author: ["木心 讲述", "陈丹青 笔录"],
		publisher: "广西师范大学出版社",
		firstEdition: { year: 2013, edition: "第一版" },
		coverUrl: null,
		description:
			"1989 至 1994 年，木心在纽约为陈丹青等一群画家讲授世界文学史，五年讲课的完整笔记。一部私人的文学宇宙。",
		recommendationReason:
			"像跟着一位毒舌又深情的老先生，把文学史重新走了一遍。",
		tags: ["文学", "随笔", "讲稿"],
		featured: true,
	},
	{
		id: "22",
		title: "棋王·树王·孩子王",
		author: ["阿城"],
		publisher: "人民文学出版社",
		firstEdition: { year: 2000, edition: "第一版" },
		coverUrl: null,
		description:
			"知青岁月里的三个故事：痴迷下棋的王一生、守着巨树的李三明、教学生认字的待业青年。汉语白描写作的范本。",
		recommendationReason:
			"白描功夫登峰造极。火车上吃的那碗饭，读一次饿一次。",
		tags: ["小说", "中国文学", "经典"],
		featured: false,
	},
	{
		id: "23",
		title: "西游记",
		author: ["吴承恩"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1980, edition: "第一版" },
		coverUrl: null,
		description:
			"孙悟空出世、大闹天宫，护送唐僧西行，历八十一难终成正果。中国最热闹的一部神魔小说，也是几代人共同的第一部长篇。",
		recommendationReason:
			"电视剧看了十遍，原书却比电视剧野得多。读到后面才发现，它讲的是一个人怎么被收进规矩里。",
		tags: ["中国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "24",
		title: "水浒传",
		author: ["施耐庵", "罗贯中"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1997, edition: "第一版" },
		coverUrl: null,
		description:
			"一百零八位好汉被逼上梁山，招安之后又各自散尽。一部把「逼」字写到底的书，越读越冷。",
		recommendationReason:
			"小时候觉得热闹，长大再读只剩难受。结局那一段的苍凉，值得单独重读一遍。",
		tags: ["中国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "25",
		title: "三国演义",
		author: ["罗贯中"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1973, edition: "第一版" },
		coverUrl: null,
		description:
			"从桃园结义到三分归晋，群雄逐鹿的一百年。权谋、忠义与天命缠在一起，写尽了中国人的政治想象。",
		recommendationReason:
			"中学时背人物绰号，工作后才看懂每一场谈判。常读常新，这四个字是真的。",
		tags: ["中国文学", "小说", "历史"],
		featured: true,
	},
	{
		id: "26",
		title: "史记",
		author: ["司马迁"],
		publisher: "中华书局",
		firstEdition: { year: 1959, edition: "第一版" },
		coverUrl: null,
		description:
			"上起黄帝，下至汉武，一百三十篇纪传体通史。写人写到骨头里，后世的史书与文章大半从这儿长出来。",
		recommendationReason:
			"项羽本纪和刺客列传是中文叙事的顶点。读史的人绕不开这一座山。",
		excerpts: ["天下熙熙，皆为利来；天下攘攘，皆为利往。"],
		tags: ["历史", "经典", "中国文学"],
		featured: true,
	},
	{
		id: "27",
		title: "古文观止",
		author: ["吴楚材 编", "吴调侯 编"],
		publisher: "中华书局",
		firstEdition: { year: 1959, edition: "第一版" },
		coverUrl: null,
		description:
			"清人编选的历代散文读本，从《左传》一路选到明末，二百二十二篇。篇幅短小，是进古文最省力的门。",
		recommendationReason:
			"每天睡前读一篇，半年刚好读完。常写东西的人手边应该备一本。",
		tags: ["中国文学", "经典", "散文"],
		featured: false,
	},
	{
		id: "28",
		title: "骆驼祥子",
		author: ["老舍"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1955, edition: "第一版" },
		coverUrl: null,
		description:
			"乡下青年祥子进城拉车，三次买车三次失去，最后被这座城市慢慢吞掉。老舍最沉的一本小说。",
		recommendationReason:
			"看完会沉默很久。它写的不是一个人没出息，而是努力本身也不管用。",
		excerpts: [
			"雨下给富人，也下给穷人；下给义人，也下给不义人。其实雨并不公道，因为下落在一个没有公道的世界上。",
		],
		tags: ["中国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "29",
		title: "家",
		author: ["巴金"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1981, edition: "第一版" },
		coverUrl: null,
		description:
			"高公馆里三兄弟的青春与反抗，觉慧出走，鸣凤投湖。一个旧式大家族怎样从内部腐烂。",
		recommendationReason:
			"年轻时读觉得热血，现在读只觉得疼。那个年代的人，连反抗都写得那么用力。",
		tags: ["中国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "30",
		title: "呼兰河传",
		author: ["萧红"],
		publisher: "人民文学出版社",
		firstEdition: { year: 2001, edition: "第一版" },
		coverUrl: null,
		description:
			"北方小城呼兰河的四季、庙会、大泥坑，和祖父的后园。萧红临终前写下的一生回望。",
		recommendationReason:
			"文字朴素得像孩子说话，读到最后才知道她在告别。后园那几章，适合出声念。",
		excerpts: [
			"花开了，就像花睡醒了似的。鸟飞了，就像鸟上天了似的。虫子叫了，就像虫子在说话似的。",
		],
		tags: ["中国文学", "小说", "童年"],
		featured: true,
	},
	{
		id: "31",
		title: "倾城之恋",
		author: ["张爱玲"],
		publisher: "北京十月文艺出版社",
		firstEdition: { year: 2009, edition: "第一版" },
		coverUrl: null,
		description:
			"白流苏与范柳原在香港的试探与算计。张爱玲最著名的中篇，一座城的沦陷成全了一段婚姻。",
		recommendationReason:
			"把爱情写得最不浪漫的一个人。每句话都凉，但凉得准确。",
		tags: ["中国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "32",
		title: "雷雨",
		author: ["曹禺"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1994, edition: "第一版" },
		coverUrl: null,
		description:
			"周家客厅里的一天，三十年的旧事被一层层掀开。中国现代话剧成熟的标志之作。",
		recommendationReason:
			"剧本比小说更好读，一个下午翻完。把人物关系画成图，会发现它严丝合缝。",
		tags: ["戏剧", "中国文学", "经典"],
		featured: false,
	},
	{
		id: "33",
		title: "沉默的大多数",
		author: ["王小波"],
		publisher: "中国青年出版社",
		firstEdition: { year: 1997, edition: "第一版" },
		coverUrl: null,
		description:
			"杂文随笔结集，谈科学、谈国学、谈尊严与沉默。九十年代最清醒也最好玩的一支笔。",
		recommendationReason:
			"每次觉得周围声音太吵，就翻几页。他不教你愤怒，他教你先把话说清楚。",
		tags: ["随笔", "人文", "经典"],
		featured: true,
	},
	{
		id: "34",
		title: "黄金时代",
		author: ["王小波"],
		publisher: "华夏出版社",
		firstEdition: { year: 1994, edition: "第一版" },
		coverUrl: null,
		description:
			"知青王二与陈清扬在云南与北京的荒诞岁月。特殊年代里的性与自由，写得坦荡又滑稽。",
		recommendationReason:
			"开头第一段就值回票价。幽默到这个程度，其实是一种很硬的态度。",
		excerpts: [
			"那一天我二十一岁，在我一生的黄金时代。我有好多奢望。我想爱，想吃，还想在一瞬间变成天上半明半暗的云。",
		],
		tags: ["中国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "35",
		title: "许三观卖血记",
		author: ["余华"],
		publisher: "作家出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"丝厂工人许三观靠着一次次卖血，撑过饥荒、灾病与家里的风浪。苦难被他写得像日常。",
		recommendationReason:
			"比《活着》暖一点。卖完血给他儿子买一碗炒肝那段，我读完去厨房站了一会儿。",
		tags: ["中国文学", "小说"],
		featured: false,
	},
	{
		id: "36",
		title: "长恨歌",
		author: ["王安忆"],
		publisher: "作家出版社",
		firstEdition: { year: 1996, edition: "第一版" },
		coverUrl: null,
		description:
			"上海小姐王琦瑶从四十年代到八十年代的一生，弄堂、公寓与流言织成的一座城市记忆。",
		recommendationReason:
			"写上海写得最细的一本。节奏慢，但一旦进去就出不来。",
		tags: ["中国文学", "小说"],
		featured: false,
	},
	{
		id: "37",
		title: "一句顶一万句",
		author: ["刘震云"],
		publisher: "长江文艺出版社",
		firstEdition: { year: 2009, edition: "第一版" },
		coverUrl: null,
		description:
			"杨百顺走出延津，牛爱国走进延津，两代人都在找一个「说得着」的人。一种中国式的孤独。",
		recommendationReason:
			"把聊天这件事写到哲学层面的奇书。看完会想起那些慢慢不联系的人。",
		tags: ["中国文学", "小说"],
		featured: false,
	},
	{
		id: "38",
		title: "额尔古纳河右岸",
		author: ["迟子建"],
		publisher: "北京十月文艺出版社",
		firstEdition: { year: 2005, edition: "第一版" },
		coverUrl: null,
		description:
			"鄂温克族最后一位酋长的女人，用一天讲完一个民族近百年的山林生活。驯鹿、萨满与河。",
		recommendationReason:
			"像听一位老人围着火塘说话。读完很久都不想刷手机。",
		tags: ["中国文学", "小说", "自然"],
		featured: true,
	},
	{
		id: "39",
		title: "繁花",
		author: ["金宇澄"],
		publisher: "上海文艺出版社",
		firstEdition: { year: 2013, edition: "第一版" },
		coverUrl: null,
		description:
			"沪生、阿宝、小毛三条线，六十年代与九十年代交替，写尽上海几十年的市井与人情。",
		recommendationReason:
			"沪语味道很重，读起来像听人闲聊。「不响」两个字，藏着半本书。",
		tags: ["中国文学", "小说"],
		featured: false,
	},
	{
		id: "40",
		title: "人世间",
		author: ["梁晓声"],
		publisher: "中国青年出版社",
		firstEdition: { year: 2017, edition: "第一版" },
		coverUrl: null,
		description:
			"北方城市里周家三兄妹的五十年，知青返城、下岗、拆迁，普通人在时代中的起落。",
		recommendationReason: "三册很厚，适合冬天读。看完会给爸妈打个电话。",
		tags: ["中国文学", "小说"],
		featured: false,
	},
	{
		id: "41",
		title: "我们仨",
		author: ["杨绛"],
		publisher: "生活·读书·新知三联书店",
		firstEdition: { year: 2003, edition: "第一版" },
		coverUrl: null,
		description:
			"一个寻寻觅觅的万里长梦，之后再无归途。杨绛在亲人相继离世后写下的家事。",
		recommendationReason:
			"薄薄一本，读完要缓一缓。她的克制比任何抒情都重。",
		tags: ["散文", "中国文学", "治愈"],
		featured: true,
	},
	{
		id: "42",
		title: "傅雷家书",
		author: ["傅雷"],
		publisher: "生活·读书·新知三联书店",
		firstEdition: { year: 1981, edition: "第一版" },
		coverUrl: null,
		description:
			"傅雷写给儿子傅聪的数百封信，谈音乐、谈做人、谈生活的细节。一份父亲的长期作业。",
		recommendationReason:
			"严厉到近乎苛刻，但每一句都是真心。做子女的读，会重新理解父母。",
		tags: ["散文", "家书", "人文"],
		featured: false,
	},
	{
		id: "43",
		title: "海子的诗",
		author: ["海子"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1995, edition: "第一版" },
		coverUrl: null,
		description:
			"麦地、村庄、太阳与远方。中国当代最纯粹的抒情声音，短促而炽烈。",
		recommendationReason:
			"适合在很累的晚上读几首。那种干净，是后来再难见到的。",
		excerpts: ["从明天起，做一个幸福的人，喂马、劈柴，周游世界。"],
		tags: ["诗歌", "中国文学", "经典"],
		featured: true,
	},
	{
		id: "44",
		title: "美的历程",
		author: ["李泽厚"],
		publisher: "生活·读书·新知三联书店",
		firstEdition: { year: 2009, edition: "第一版" },
		coverUrl: null,
		description:
			"从远古图腾到明清文艺，一次中国审美意识的巡礼。写得像散文的美术史与思想史。",
		recommendationReason:
			"看完再去博物馆，展品会开口说话。美学入门最好读的一本。",
		tags: ["艺术", "人文", "经典"],
		featured: false,
	},
	{
		id: "45",
		title: "中国哲学简史",
		author: ["冯友兰", "涂又光 译"],
		publisher: "北京大学出版社",
		firstEdition: { year: 2013, edition: "第一版" },
		coverUrl: null,
		description:
			"冯友兰用英文写给西方读者的中国哲学通史，从诸子百家讲到近代。脉络清楚，篇幅克制。",
		recommendationReason:
			"想了解中国思想又怕啃原著，就从这本开始。译笔是作者亲自认可的。",
		tags: ["哲学", "人文", "经典"],
		featured: true,
	},
	{
		id: "46",
		title: "战争与和平",
		author: ["列夫·托尔斯泰", "草婴 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2004, edition: "第一版" },
		coverUrl: null,
		description:
			"一八一二年的俄法战争，四大家族的命运彼此交织。小说与史论交替，一部关于「历史如何发生」的巨著。",
		recommendationReason:
			"很厚，值得排进一年的计划。看完会对英雄这个词产生怀疑。",
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "47",
		title: "安娜·卡列尼娜",
		author: ["列夫·托尔斯泰", "草婴 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2004, edition: "第一版" },
		coverUrl: null,
		description:
			"安娜为爱情离开家庭，却在众人的注视下一步步走向铁轨；列文在乡下寻找生活的答案。",
		recommendationReason:
			"开头那句太有名，反而容易忽略后半本。列文那条线，越读越像自己。",
		excerpts: ["幸福的家庭都是相似的，不幸的家庭各有各的不幸。"],
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "48",
		title: "罪与罚",
		author: ["陀思妥耶夫斯基", "朱海观 译"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1982, edition: "第一版" },
		coverUrl: null,
		description:
			"大学生拉斯柯尔尼科夫杀死放高利贷的老太婆，从此与自己的良心对峙。一场漫长的内心审讯。",
		recommendationReason:
			"读的时候心跳会加快。写人的自我拷问，没人写得过他。",
		tags: ["外国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "49",
		title: "卡拉马佐夫兄弟",
		author: ["陀思妥耶夫斯基", "耿济之 译"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1981, edition: "第一版" },
		coverUrl: null,
		description:
			"一桩弑父案，四个性格迥异的兄弟，信仰、理性与欲望正面相撞。陀翁的收官之作。",
		recommendationReason:
			"宗教大法官那一章，单独抽出来都够想一个月。读完会重新想自由这件事。",
		tags: ["外国文学", "小说", "哲学"],
		featured: false,
	},
	{
		id: "50",
		title: "傲慢与偏见",
		author: ["简·奥斯汀", "王科一 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"伊丽莎白与达西互相看不顺眼，又互相改变。英格兰乡间的舞会、信件与流言。",
		recommendationReason: "言语机锋最好看的一本。每句对话都像在下棋。",
		excerpts: [
			"凡是有钱的单身汉，总想娶位太太，这已经成了一条举世公认的真理。",
		],
		tags: ["外国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "51",
		title: "简·爱",
		author: ["夏洛蒂·勃朗特", "祝庆英 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"孤女简·爱在舅母家、寄宿学校和桑菲尔德庄园长大，始终不肯为了爱交出自尊。",
		recommendationReason: "一百七十年前的女性独立宣言，今天读依然硬气。",
		excerpts: ["你以为我穷、低微、不美、矮小，我就没有灵魂没有心吗？"],
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "52",
		title: "呼啸山庄",
		author: ["艾米莉·勃朗特", "方平 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"荒原上的两座宅子，希思克利夫与凯瑟琳的仇恨与执念，烧掉了整整两代人。",
		recommendationReason: "比《简·爱》更野、更暗。喜欢不来，但忘不掉。",
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "53",
		title: "巴黎圣母院",
		author: ["雨果", "陈敬容 译"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1982, edition: "第一版" },
		coverUrl: null,
		description:
			"十五世纪的巴黎，敲钟人卡西莫多、吉卜赛女郎爱斯梅拉达与副主教，在圣母院的石头之间纠缠。",
		recommendationReason:
			"雨果写建筑整整用了一章，读进去才发现那才是主角。",
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "54",
		title: "悲惨世界",
		author: ["雨果", "李丹 译", "方于 译"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1978, edition: "第一版" },
		coverUrl: null,
		description:
			"冉阿让为一块面包服苦役十九年，出狱后被主教点亮，从此一生逃亡与赎罪。",
		recommendationReason:
			"五册，读到最后一页会想站起来。关于善，写得最有说服力的一本书。",
		tags: ["外国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "55",
		title: "约翰·克利斯朵夫",
		author: ["罗曼·罗兰", "傅雷 译"],
		publisher: "人民文学出版社",
		firstEdition: { year: 1957, edition: "第一版" },
		coverUrl: null,
		description:
			"一个德国音乐家从童年到晚年的一生，反抗、流亡、创作与友谊。傅雷译笔的代表作。",
		recommendationReason: "年轻时读最合适。它教人在还很弱的时候怎么站着。",
		tags: ["外国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "56",
		title: "变形记",
		author: ["卡夫卡"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2007, edition: "第一版" },
		coverUrl: null,
		description:
			"推销员格里高尔一觉醒来变成甲虫，家人的耐心在几天之内耗尽。一则现代人的处境寓言。",
		recommendationReason: "开篇第一句就把人摁住了。短，但后劲极大。",
		excerpts: [
			"一天早晨，格里高尔·萨姆沙从不安的睡梦中醒来，发现自己躺在床上变成了一只巨大的甲虫。",
		],
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "57",
		title: "老人与海",
		author: ["海明威", "吴劳 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"老渔夫圣地亚哥八十四天没捕到鱼，终于钓上一条巨大的马林鱼，归途中又被鲨鱼啃尽。",
		recommendationReason:
			"两小时读完，之后想了很多年。硬汉这两个字，他定义得最干净。",
		excerpts: ["一个人可以被毁灭，但不能被打败。"],
		tags: ["外国文学", "小说", "经典"],
		featured: true,
	},
	{
		id: "58",
		title: "了不起的盖茨比",
		author: ["菲茨杰拉德", "巫宁坤 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"长岛的夏夜，神秘富豪盖茨比隔着海湾追逐一盏绿灯，追的其实是旧梦本身。",
		recommendationReason:
			"不长，但每一句都讲究。结尾那段是英文小说里最好的结尾之一。",
		excerpts: [
			"我们继续奋力向前，逆水行舟，被不断地向后推，直到回到往昔岁月。",
		],
		tags: ["外国文学", "小说", "经典"],
		featured: false,
	},
	{
		id: "59",
		title: "麦田里的守望者",
		author: ["J.D.塞林格", "施咸荣 译"],
		publisher: "译林出版社",
		firstEdition: { year: 2007, edition: "第一版" },
		coverUrl: null,
		description:
			"被退学的少年霍尔顿在纽约游荡三天，看什么都不顺眼，只想守住孩子们的麦田。",
		recommendationReason:
			"十七岁读是共鸣，三十岁读是心疼。年年重读都不腻。",
		tags: ["外国文学", "小说", "成长"],
		featured: false,
	},
	{
		id: "60",
		title: "杀死一只知更鸟",
		author: ["哈珀·李", "李育超 译"],
		publisher: "译林出版社",
		firstEdition: { year: 2010, edition: "第一版" },
		coverUrl: null,
		description:
			"南方小镇上，律师阿蒂克斯为黑人辩护，六岁的斯库特在一旁长大。关于偏见与教养。",
		recommendationReason:
			"最好的一本讲怎么当父亲的书。公正不是天赋，是每天的选择。",
		tags: ["外国文学", "小说", "成长"],
		featured: true,
	},
	{
		id: "61",
		title: "1984",
		author: ["乔治·奥威尔", "董乐山 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2008, edition: "第一版" },
		coverUrl: null,
		description:
			"大洋国里，电幕、思想警察与新话构成一整套控制技术。温斯顿试着保留一点点真实。",
		recommendationReason:
			"有些书是常识，没读过就永远缺一块。这本是其中之一。",
		excerpts: [
			"谁控制了过去，谁就控制了未来；谁控制了现在，谁就控制了过去。",
		],
		tags: ["小说", "外国文学", "科幻"],
		featured: true,
	},
	{
		id: "62",
		title: "动物农场",
		author: ["乔治·奥威尔", "荣如德 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2007, edition: "第一版" },
		coverUrl: null,
		description:
			"庄园里的动物赶走人类自己当家，墙上的规则却被一条条改掉。一则极短的寓言。",
		recommendationReason:
			"一百多页，一个晚上读完。看完再开会，会多留意墙上的字。",
		excerpts: ["凡动物一律平等，但是有些动物比别的动物更加平等。"],
		tags: ["小说", "外国文学", "寓言"],
		featured: false,
	},
	{
		id: "63",
		title: "挪威的森林",
		author: ["村上春树", "林少华 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2007, edition: "第一版" },
		coverUrl: null,
		description:
			"渡边在东京的青春里失去与得到，直子与绿，一边是死亡，一边是生活。",
		recommendationReason:
			"林少华的译本有它自己的味道。适合二十岁出头那几年读。",
		excerpts: ["哪里会有人喜欢孤独，只是不喜欢失望罢了。"],
		tags: ["外国文学", "小说", "成长"],
		featured: false,
	},
	{
		id: "64",
		title: "沙丘",
		author: ["弗兰克·赫伯特"],
		publisher: "江苏凤凰文艺出版社",
		firstEdition: { year: 2017, edition: "第一版" },
		coverUrl: null,
		description:
			"厄拉科斯星球上，香料、沙虫与预言缠在一起，少年保罗被推上救世主的位置。",
		recommendationReason:
			"生态、宗教、政治混在一起却依然耐读。六十年代的书，今天看仍不过时。",
		excerpts: ["恐惧是思维杀手，恐惧是带来彻底毁灭的小小死神。"],
		tags: ["科幻", "小说", "外国文学"],
		featured: true,
	},
	{
		id: "65",
		title: "时间简史",
		author: ["史蒂芬·霍金", "许明贤 译", "吴忠超 译"],
		publisher: "湖南科学技术出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"从大爆炸到黑洞到时间箭头，霍金为普通人写的一部宇宙简史。没有公式，只有问题。",
		recommendationReason:
			"中学时读不懂，大学再读通了一半。常备一本，随手翻。",
		tags: ["科普", "科学", "经典"],
		featured: true,
	},
	{
		id: "66",
		title: "自私的基因",
		author: ["理查德·道金斯", "卢允中 译"],
		publisher: "中信出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"从基因的视角重看进化：生物只是基因的生存机器。利他、亲缘与两性之争由此被重新解释。",
		recommendationReason:
			"观点未必全盘接受，但读完看动物的眼神会变。科普写作的范本。",
		tags: ["科普", "科学", "人文"],
		featured: false,
	},
	{
		id: "67",
		title: "枪炮、病菌与钢铁",
		author: ["贾雷德·戴蒙德", "谢延光 译"],
		publisher: "上海译文出版社",
		firstEdition: { year: 2006, edition: "第一版" },
		coverUrl: null,
		description:
			"为什么是欧亚大陆征服了世界？答案在作物、牲畜、病菌与地理，而不在人种。",
		recommendationReason:
			"读完会对命运这个词有新理解。论证严密，例子好记。",
		tags: ["科普", "历史", "人文"],
		featured: true,
	},
	{
		id: "68",
		title: "乌合之众",
		author: ["古斯塔夫·勒庞", "冯克利 译"],
		publisher: "中央编译出版社",
		firstEdition: { year: 2005, edition: "第一版" },
		coverUrl: null,
		description:
			"群体如何形成、如何被暗示与传染、如何失去理性。大众心理学的第一本小册子。",
		recommendationReason:
			"写于十九世纪，热搜时代读尤其刺眼。薄，容易读完。",
		tags: ["心理", "社会学", "人文"],
		featured: false,
	},
	{
		id: "69",
		title: "思考，快与慢",
		author: ["丹尼尔·卡尼曼", "胡晓姣 译"],
		publisher: "中信出版社",
		firstEdition: { year: 2012, edition: "第一版" },
		coverUrl: null,
		description:
			"系统 1 与系统 2、锚定、可得性、损失厌恶——诺奖得主对人类判断偏差的系统整理。",
		recommendationReason:
			"每章都有「原来我一直在犯」的时刻。厚，但可以挑着读。",
		tags: ["心理", "科普", "科学"],
		featured: true,
	},
	{
		id: "70",
		title: "黑客与画家",
		author: ["保罗·格雷厄姆", "阮一峰 译"],
		publisher: "人民邮电出版社",
		firstEdition: { year: 2011, edition: "第一版" },
		coverUrl: null,
		description:
			"程序员为什么像画家，创业、财富与设计语言从何处来。写给技术人的一组长文。",
		recommendationReason:
			"写代码的人读完会有共鸣，尤其是讲创造者时间表那几篇。",
		tags: ["计算机", "随笔", "人文"],
		featured: false,
	},
];

/* ---------- 顶层运行时断言（fail fast）---------- */

function assertBooksValid(data: Book[]): void {
	const seen = new Set<string>();
	for (const b of data) {
		const where = `books[id=${b?.id ?? "?"}]`;
		if (!/^\d{2}$/.test(b.id))
			throw new Error(`${where}: id 必须是两位数字字符串`);
		if (seen.has(b.id)) throw new Error(`${where}: id 重复`);
		seen.add(b.id);
		if (
			!Array.isArray(b.author) ||
			b.author.length === 0 ||
			b.author.some((a) => typeof a !== "string" || a.trim() === "")
		) {
			throw new Error(`${where}: author 必须为非空 string[]`);
		}
		for (const field of [
			"title",
			"publisher",
			"description",
			"recommendationReason",
		] as const) {
			if (typeof b[field] !== "string" || b[field].trim() === "") {
				throw new Error(`${where}: ${field} 必须为非空字符串`);
			}
		}
		if (!Number.isInteger(b.firstEdition?.year))
			throw new Error(`${where}: firstEdition.year 必须为整数`);
		if (
			typeof b.firstEdition?.edition !== "string" ||
			b.firstEdition.edition === ""
		) {
			throw new Error(`${where}: firstEdition.edition 必须为非空字符串`);
		}
		if (
			b.coverUrl !== null &&
			!(typeof b.coverUrl === "string" && b.coverUrl.startsWith("/"))
		) {
			throw new Error(
				`${where}: coverUrl 必须为 null 或以 / 开头的本地路径`,
			);
		}
		if (
			!Array.isArray(b.tags) ||
			b.tags.length === 0 ||
			b.tags.some((t) => typeof t !== "string" || t.trim() === "")
		) {
			throw new Error(`${where}: tags 必须为非空 string[]`);
		}
		if (typeof b.featured !== "boolean")
			throw new Error(`${where}: featured 必须为 boolean`);
	}
}

assertBooksValid(BOOKS);

/** 站长推荐池规模下限：featured 换一组需「新组排除旧组全部 6 本」，
 *  池 >= 2×6 才能保证每次整组替换都可行（原型 13 本满足）。 */
const FEATURED_POOL_MIN = 12;
const featuredCount = BOOKS.filter((b) => b.featured).length;
if (featuredCount < FEATURED_POOL_MIN) {
	throw new Error(
		`books: featured 池仅 ${featuredCount} 本，少于整组换所需的 ${FEATURED_POOL_MIN} 本下限`,
	);
}

/* ---------- 查询工具 ---------- */

/** 全量书籍（V1 fixture，只读约定：外部不得修改数组元素） */
export const books: readonly Book[] = BOOKS;

/** 站长推荐池（featured === true） */
export const featuredBooks: readonly Book[] = BOOKS.filter((b) => b.featured);

export function getBookById(id: string): Book | null {
	return BOOKS.find((b) => b.id === id) ?? null;
}

/** 同架图书：按共享标签数降序取前 n 本（排除自身，仅保留至少共享 1 个标签者） */
export function getSameShelf(book: Book, n = 4): Book[] {
	return BOOKS.filter((b) => b.id !== book.id)
		.map((b) => ({
			b,
			overlap: b.tags.filter((t) => book.tags.includes(t)).length,
		}))
		.filter((x) => x.overlap > 0)
		.sort((a, z) => z.overlap - a.overlap)
		.slice(0, n)
		.map((x) => x.b);
}

/** 全部标签按出现频次降序（同频次按首次出现顺序） */
export function allTags(): string[] {
	const counts = new Map<string, number>();
	for (const b of BOOKS) {
		for (const t of b.tags) {
			counts.set(t, (counts.get(t) ?? 0) + 1);
		}
	}
	return Array.from(counts.entries())
		.sort((a, z) => z[1] - a[1])
		.map(([tag]) => tag);
}
