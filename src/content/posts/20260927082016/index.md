---
title: "驯服 AI 造成的代码垃圾：用“深模块”哲学与架构重构重塑代码库"
published: 2026-09-27 08:20:16
readingTime: 15
description: "结合 Ousterhout 的深模块思想与 Matt Pocock 的代码库架构梳理技能，介绍识别浅模块、统一设计词汇并改善重构讨论的方法。"
image: /images/posts/20260927082016/matt-pocock-de-slop-youtube-cover.jpg
tags: [AI编程, Vibe Coding, 工作流]
category: 技术架构
draft: false
private: false
views: 0
comments: 0
hotness: 0
---

_架构实战与工程反思 · 核心术语：Deep Modules、Seam、Leverage、Locality_

:::important[核心提炼]
AI 降低了生成和修改代码的成本，也让只顾眼前任务、忽略整体结构的改动更容易累积。深模块的思路是：用清楚而精简的接口承载连贯的内部行为，让调用者少操心细节，让修改和验证尽量集中在模块内部。
:::

## 一、AI 编码时代的新危机：软件熵增加速器

大语言模型与代码生成 Agent 提高了写功能、补测试和尝试方案的速度，但代码量增加不等于代码库更容易维护。若每次都只按眼前的小任务拆分代码，局部看似清楚的文件和函数，组合起来仍可能让后续重构与扩展变得困难。这类难以理解、重复转手、缺少清晰边界的代码，常被称为 **AI Code Slop**。

常见信号包括：

- **测试只覆盖容易隔离的函数**：单个计算函数有测试，但业务编排、调用顺序和外部状态之间的行为没有得到同等验证。
- **浅模块不断增加**：接口暴露许多参数或方法，内部却只做简单透传；调用者需要理解的内容没有随模块拆分而减少。
- **局部性变差**：例如理解“用户下单并核销优惠券”需要在多个目录间跳转，修改一个规则还得同步检查好几个调用点。

小函数、服务或接口本身不是问题。真正要检查的是：一个抽象是否替调用者收起了有意义的复杂度，还是只把代码从一个文件搬到了另一个文件。

## 二、理论基石：Ousterhout 的“深模块”

斯坦福大学计算机科学教授 John Ousterhout 在《[A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/aposd.php)》（《软件设计哲学》）中讨论了模块深度。直观地说，**深模块**把较多、有内聚的行为放在一个相对简单的接口后面；调用者只需掌握少量规则，就能完成一件完整的工作。为便于工程讨论，本文沿用 Matt Pocock 的操作化视角：深度关注调用者每学会一单位接口能使用多少连贯行为，而不是按实现代码行数衡量；具体术语见下节引用的设计词汇。

| 观察角度   | 浅模块                         | 深模块                               |
| ---------- | ------------------------------ | ------------------------------------ |
| 对外接口   | 暴露很多方法、参数或内部细节   | 接口精简，方法表达业务意图           |
| 内部实现   | 简单透传，复杂度仍由调用方承担 | 集中处理一组连贯的业务行为和内部状态 |
| 调用者负担 | 需要了解并协调多个低层步骤     | 通过较少的接口完成更多工作           |
| 修改影响   | 规则散落在多个调用点           | 相关变化更可能集中在模块内部         |

:::tip[删除测试]
怀疑某个模块只是多余包装时，可以做一个思想实验：如果把它删掉，系统复杂度会随之消失，还是会分散到许多调用方？如果只是把调用方的工作重新摊开，它可能正在提供有价值的深度；如果复杂度确实消失，它可能只是一次没有带来收益的转手。
:::

## 三、核心术语表：建立共同的设计词汇

Matt Pocock 的 [codebase-design 参考](https://github.com/mattpocock/skills/blob/main/docs/engineering/codebase-design.md)用一组相互关联的术语讨论模块设计。这里的要点是让讨论中的词义保持一致，不是宣称所有项目都必须采用同一套目录结构。

| 术语                   | 含义                                                                                           | 讨论时要留意                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Module（模块）**     | 有公开接口和私有实现的实体，可以是函数、类、包，也可以跨越多个技术层。                         | 不要只凭文件夹或类名判断模块边界。                             |
| **Interface（接口）**  | 调用者正确使用模块需要掌握的全部信息，包括类型、约束、调用顺序、错误模式、配置要求和性能特征。 | 不只指 TypeScript 的 `interface` 关键字，也不只是方法签名。    |
| **Depth（深度）**      | 调用者每学会一单位接口，能借此使用多少连贯行为。                                               | 不是代码行数，也不是实现越复杂就越深。                         |
| **Seam（接缝）**       | 可以在不改动该处代码的情况下改变程序行为的位置；接口位于接缝处。                               | 先说明行为变化发生在哪里，再决定哪些实现可以替换。             |
| **Adapter（适配器）**  | 在接缝处满足接口的具体实现，描述的是角色。                                                     | 内存 Fake 和真实数据库仓储都可能是同一接缝上的不同适配器。     |
| **Leverage（杠杆）**   | 调用者学习接口后获得的能力：较少的接口知识可以驱动较多工作。                                   | 如果调用它仍需要调用方手动重复相同编排，杠杆就很有限。         |
| **Locality（局部性）** | 修改、修复和验证尽量集中在一个合适的模块内。                                                   | 修复优惠券规则时，理想情况下不必同步改动许多互不相关的调用点。 |

该参考还给出一个实用提醒：只有一个实现时，接缝可能只是“假设将来会替换”的间接层；出现第二个确实不同的适配器，才更能说明替换点有现实用途。不要为了模式本身，提前制造不必要的抽象。

## 四、Agent 实战：`improve-codebase-architecture` 如何工作

Matt Pocock 的 [`improve-codebase-architecture` 技能说明](https://github.com/mattpocock/skills/blob/main/docs/engineering/improve-codebase-architecture.md)把它定义为架构调查：寻找值得深化的候选项，生成独立 HTML 报告，再围绕人选中的候选项开展讨论。下面将官方行为归纳成三个环节，便于阅读；这不是技能声明的固定“三阶段流程”。

1. **确定调查范围并寻找摩擦**：遵循 YAGNI，优先留意近期仍在变化的代码路径；通过删除测试判断，删掉某个抽象后复杂度究竟会消失还是散到调用方。若项目已有 `CONTEXT.md` 或 `docs/adr/`，技能会参考其中的领域词汇和决策。
2. **产出候选报告**：技能把候选项写入操作系统临时目录中的 HTML 报告。候选卡片会说明相关文件、当前摩擦、建议的深模块形状、局部性与杠杆方面的收益，并给出前后示意和 `Strong`、`Worth exploring`、`Speculative` 等推荐强度。
3. **由人选择，再讨论设计**：选择候选后，Agent 会围绕约束、依赖、接缝、需要保留的测试和新接口形状进行推演。讨论产物是设计决定，不是代码差异；技能会在讨论时补充或修整 `CONTEXT.md` 中的术语，并可提出把被否决的候选记入 ADR。具体重构之后仍须进入常规实现流程。

**这个技能不会直接改动代码。** 报告和讨论帮助人决定下一步做什么；落地工作要另行执行、验证与审查。

## 五、工程示例：从浅模块到深模块

以下是电商结算场景的**示意片段**，类型定义已省略。重点是比较公开入口与职责如何组织，不是可直接用于生产的结算实现。

### 重构前：步骤散落在调用方

```ts
// 只展示问题形态，类型定义省略
export function validateCartItems(items: CartItem[]) {
	if (!items || items.length === 0) throw new Error("购物车为空");
	return items.filter((item) => item.quantity > 0);
}

export function computeOrderTotal(items: CartItem[], couponRate: number) {
	const sum = items.reduce(
		(total, item) => total + item.price * item.quantity,
		0,
	);
	return sum * (1 - couponRate);
}

export async function deductInventoryApi(
	api: InventoryService,
	items: CartItem[],
) {
	return api.batchDeduct(items);
}

async function handleCheckoutFlow(cart, coupon, inventoryApi, paymentApi) {
	const validItems = validateCartItems(cart.items);
	const total = computeOrderTotal(validItems, coupon.rate);

	await deductInventoryApi(inventoryApi, validItems);
	try {
		await paymentApi.charge({ amount: total });
	} catch (error) {
		// 失败处理暴露在编排代码中；实际系统还必须定义补偿与幂等语义
		await inventoryApi.rollback(validItems);
		throw error;
	}
}
```

每个小函数单独看都可能很容易测试，但库存预留、支付和失败处理的调用顺序仍需要调用方理解并协调。这里要问的是：抽取出的模块有没有替调用者隐藏业务复杂度？

### 重构后：对外表达结算意图

```ts
export interface OrderFulfillment {
	checkout(command: CheckoutCommand): Promise<CheckoutResult>;
}

export interface CheckoutCommand {
	userId: string;
	cartItems: Array<{ sku: string; quantity: number; unitPrice: number }>;
	couponCode?: string;
	paymentToken: string;
}

export class OrderFulfillmentModule implements OrderFulfillment {
	constructor(
		private readonly paymentGateway: PaymentAdapter,
		private readonly warehouse: InventoryAdapter,
		private readonly orderRepo: OrderRepository,
	) {}

	async checkout(command: CheckoutCommand): Promise<CheckoutResult> {
		this.assertValidItems(command.cartItems);

		const reservation = await this.warehouse.reserve(command.cartItems);
		const totalAmount = this.calculateFinalAmount(
			command.cartItems,
			command.couponCode,
		);
		const paymentReceipt = await this.paymentGateway.charge({
			token: command.paymentToken,
			amount: totalAmount,
			idempotencyKey: reservation.id,
		});
		const order = await this.orderRepo.saveOrder({
			userId: command.userId,
			items: command.cartItems,
			total: totalAmount,
			paymentId: paymentReceipt.id,
			status: "CONFIRMED",
		});

		return {
			success: true,
			orderId: order.id,
			receiptUrl: paymentReceipt.url,
		};
	}

	private assertValidItems(items: CheckoutCommand["cartItems"]) {
		if (!items || items.length === 0)
			throw new InvalidCartException("Cart is empty");
	}

	private calculateFinalAmount(
		items: CheckoutCommand["cartItems"],
		couponCode?: string,
	): number {
		// 为突出模块边界，示例省略优惠券规则与价格校验。
		return items.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);
	}
}
```

对外，调用方只需表达一次 `checkout` 意图；模块内部负责组织校验、库存、支付和订单存储等协作。**这个片段没有实现完整的生产级事务、重试或补偿保证**：例如支付成功后写订单失败时如何退款、释放库存并保持幂等，都需要按实际业务明确设计和测试。深模块应隐藏一套正确且可验证的策略，不能只把步骤装进一个类就算完成。

## 六、落地实践：把深模块原则融入日常研发

- **观察接口负担，而不是套用硬阈值**：当一个入口持续接收许多上下文依赖，或调用方反复手写相同编排时，检查是否有更合适的模块边界。“七个以上依赖”可以作为提醒自己的例子，不是普适规则。
- **用业务意图命名方法**：`orderFulfillment.checkout(...)` 往往比调用方分别拼接 `save()`、`deduct()` 等底层步骤更能表达完整意图，前提是模块确实承担了这些职责。
- **从接缝验证行为**：优先通过公开接口检查调用者实际依赖的契约，不要只为了追求覆盖率就把私有实现抽成公开函数。内部接缝也可以有自己的测试，但应由设计和验证需要决定。
- **持续检查近期变化区域**：定期看哪些文件反复修改、哪些业务动作需要跳转多个位置理解，再用删除测试和局部性等概念评估是否值得重构。不是所有代码都需要抽象。

:::tip[判断重构是否值得]
先问“调用方现在必须知道什么”“删除这个模块后复杂度去了哪里”，再决定要不要合并、拆分或增加接缝。目标是减少真实的理解和修改成本，而不是追求更多层次或更多模式。
:::

### 参考来源

- Matt Pocock：[《How To De-Slop A Codebase Ruined By AI》视频](https://www.youtube.com/watch?v=3MP8D-mdheA)
- Matt Pocock：[架构梳理技能说明](https://github.com/mattpocock/skills/blob/main/docs/engineering/improve-codebase-architecture.md) · [深模块设计词汇](https://github.com/mattpocock/skills/blob/main/docs/engineering/codebase-design.md)
- John Ousterhout：[《A Philosophy of Software Design》书籍页面](https://web.stanford.edu/~ouster/cgi-bin/aposd.php)

_原稿署名：工程架构洞察。本文保留原稿六章结构，并按相关原始资料校正流程与示例边界。_
