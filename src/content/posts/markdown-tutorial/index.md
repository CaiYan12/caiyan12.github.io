---
title: Markdown 语法教程
published: 2025-01-20
description: 一份完整的 Markdown 语法示例，涵盖核心语法与扩展（GFM）。
tags: [Markdown, 语法]
category: 教程
---

# Markdown 语法教程

一份 Markdown 示例，展示如何编写 Markdown 文件。本文整合了核心语法与扩展（GFM）。

- [块级元素](#块级元素)
  - [段落与换行](#段落与换行)
  - [标题](#标题)
  - [引用](#引用)
  - [列表](#列表)
  - [代码块](#代码块)
  - [水平分割线](#水平分割线)
  - [表格](#表格)
- [行内元素](#行内元素)
  - [链接](#链接)
  - [强调](#强调)
  - [代码](#代码)
  - [图片](#图片)
  - [删除线](#删除线)
- [其他](#其他)
  - [自动链接](#自动链接)
  - [反斜杠转义](#反斜杠转义)
- [行内 HTML](#行内-html)

## 块级元素

### 段落与换行

#### 段落

HTML 标签：`<p>`

一个或多个空行（只有**空格**或**制表符**的行视为空行）。

代码：

    This will be
    inline.

    This is second paragraph.

预览：

---

This will be
inline.

This is second paragraph.

---

#### 换行

HTML 标签：`<br />`

在行尾加**两个或更多空格**。

代码：

    This will be not
    inline.

预览：

---

This will be not  
inline.

---

### 标题

Markdown 支持两种标题风格：Setext 和 atx。

#### Setext

HTML 标签：`<h1>`、`<h2>`

用**等号（=）**表示 `<h1>`，**连字符（-）**表示 `<h2>`，数量不限。

代码：

    This is an H1
    =============
    This is an H2
    -------------

预览：

---

# This is an H1

## This is an H2

---

#### atx

HTML 标签：`<h1>` ~ `<h6>`

在行首使用 1-6 个**井号（#）**，对应 `<h1>` - `<h6>`。

代码：

    # This is an H1
    ## This is an H2
    ###### This is an H6

预览：

---

# This is an H1

## This is an H2

###### This is an H6

---

可选地在标题末尾「闭合」atx 标题。结尾的井号**不必与开头数量一致**。

代码：

    # This is an H1 #
    ## This is an H2 ##
    ### This is an H3 ######

预览：

---

# This is an H1

## This is an H2

### This is an H3

---

### 引用

HTML 标签：`<blockquote>`

Markdown 使用邮件风格的 **>** 字符进行引用。最好对文本进行硬换行，并在每行前面加一个 >。

代码：

    > This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
    > consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
    > Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
    >
    > Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
    > id sem consectetuer libero luctus adipiscing.

预览：

---

> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.
>
> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
> id sem consectetuer libero luctus adipiscing.

---

Markdown 允许偷懒：只在硬换行段落的第一行前面加 >。

代码：

    > This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
    consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
    Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.

    > Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
    id sem consectetuer libero luctus adipiscing.

预览：

---

> This is a blockquote with two paragraphs. Lorem ipsum dolor sit amet,
> consectetuer adipiscing elit. Aliquam hendrerit mi posuere lectus.
> Vestibulum enim wisi, viverra nec, fringilla in, laoreet vitae, risus.

> Donec sit amet nisl. Aliquam semper ipsum sit amet velit. Suspendisse
> id sem consectetuer libero luctus adipiscing.

---

引用可以嵌套（即引用中的引用），只需增加 > 的层级。

代码：

    > This is the first level of quoting.
    >
    > > This is nested blockquote.
    >
    > Back to the first level.

预览：

---

> This is the first level of quoting.
>
> > This is nested blockquote.
>
> Back to the first level.

---

引用可以包含其他 Markdown 元素，包括标题、列表和代码块。

代码：

    > ## This is a header.
    >
    > 1.   This is the first list item.
    > 2.   This is the second list item.
    >
    > Here's some example code:
    >
    >     return shell_exec("echo $input | $markdown_script");

预览：

---

> ## This is a header.
>
> 1.  This is the first list item.
> 2.  This is the second list item.
>
> Here's some example code:
>
>     return shell_exec("echo $input | $markdown_script");

---

### 列表

Markdown 支持有序（编号）和无序（项目符号）列表。

#### 无序

HTML 标签：`<ul>`

无序列表使用**星号（\*）**、**加号（+）**和**连字符（-）**。

代码：

    *   Red
    *   Green
    *   Blue

预览：

---

- Red
- Green
- Blue

---

与下面写法等价：

代码：

    +   Red
    +   Green
    +   Blue

以及：

代码：

    -   Red
    -   Green
    -   Blue

#### 有序

HTML 标签：`<ol>`

有序列表使用数字加句点：

代码：

    1.  Bird
    2.  McHale
    3.  Parish

预览：

---

1.  Bird
2.  McHale
3.  Parish

---

有可能意外触发有序列表，比如这样写：

代码：

    1986. What a great season.

预览：

---

1986. What a great season.

---

你可以**用反斜杠转义（\\)** 句点：

代码：

    1986\. What a great season.

预览：

---

1986\. What a great season.

---

#### 缩进

##### 引用

要在列表项中放置引用，引用行的 > 定界符需要缩进：

代码：

    *   A list item with a blockquote:

        > This is a blockquote
        > inside a list item.

预览：

---

- A list item with a blockquote:

  > This is a blockquote
  > inside a list item.

---

##### 代码块

要在列表项中放置代码块，代码块需要缩进两次 —— **8 个空格**或**两个制表符**：

代码：

    *   A list item with a code block:

            <code goes here>

预览：

---

- A list item with a code block:

      <code goes here>

---

##### 嵌套列表

代码：

    * A
      * A1
      * A2
    * B
    * C

预览：

---

- A
  - A1
  - A2
- B
- C

---

### 代码块

HTML 标签：`<pre>`

把代码块的每一行缩进**至少 4 个空格**或**1 个制表符**。

代码：

    This is a normal paragraph:

        This is a code block.

预览：

---

This is a normal paragraph:

    This is a code block.

---

代码块会一直持续到出现未缩进的行（或文章结尾）。

在代码块中，**与号（&）**和尖**括号（< 和 >）**会被自动转换为 HTML 实体。

代码：

        <div class="footer">
            &copy; 2004 Foo Corporation
        </div>

预览：

---

    <div class="footer">
        &copy; 2004 Foo Corporation
    </div>

---

以下「围栏代码块」和「语法高亮」是扩展，也可以用另一种方式编写代码块。

#### 围栏代码块

用 ``` 包裹代码即可，无需缩进四个空格。

代码：

    Here's an example:

    ```
    function test() {
      console.log("notice the blank line before this function?");
    }
    ```

预览：

---

Here's an example:

```
function test() {
  console.log("notice the blank line before this function?");
}
```

---

#### 语法高亮

在围栏代码块中加入可选的语言标识，即可进行语法高亮（[支持的语言](https://github.com/github/linguist/blob/master/lib/linguist/languages.yml)）。

代码：

    ```ruby
    require 'redcarpet'
    markdown = Redcarpet.new("Hello World!")
    puts markdown.to_html
    ```

预览：

---

```ruby
require 'redcarpet'
markdown = Redcarpet.new("Hello World!")
puts markdown.to_html
```

---

### 水平分割线

HTML 标签：`<hr />`
在一行中放置**三个或更多连字符（-）、星号（\*）或下划线（\_）**。连字符或星号之间可以有空格。

代码：

    * * *
    ***
    *****
    - - -
    ---------------------------------------
    ___

预览：

---

---

---

---

---

---

---

---

---

### 表格

HTML 标签：`<table>`

这是一种扩展。

用**竖线（|）**分隔列，用**连字符（-）**分隔表头，并用**冒号（:）**控制对齐。

两端的**竖线（|）**和对齐是可选的。表头分隔符每个单元格至少需要 **3 个定界符**。

代码：

```
| Left | Center | Right |
|:-----|:------:|------:|
|aaa   |bbb     |ccc    |
|ddd   |eee     |fff    |

 A | B
---|---
123|456


A |B
--|--
12|45
```

预览：

---

| Left | Center | Right |
| :--- | :----: | ----: |
| aaa  |  bbb   |   ccc |
| ddd  |  eee   |   fff |

| A   | B   |
| --- | --- |
| 123 | 456 |

| A   | B   |
| --- | --- |
| 12  | 45  |

---

## 行内元素

### 链接

HTML 标签：`<a>`

Markdown 支持两种链接风格：行内和引用。

#### 行内

行内链接格式：`[链接文字](URL "标题")`

标题是可选的。

代码：

    This is [an example](http://example.com/ "Title") inline link.

    [This link](http://example.net/) has no title attribute.

预览：

---

This is [an example](http://example.com/ "Title") inline link.

[This link](http://example.net/) has no title attribute.

---

如果引用同一服务器上的本地资源，可以使用相对路径：

代码：

    See my [About](/about/) page for details.

预览：

---

See my [About](/about/) page for details.

---

#### 引用

可以预先定义链接引用。格式：`[id]: URL "标题"`

标题也是可选的。之后这样引用链接：`[链接文字][id]`

代码：

    [id]: http://example.com/  "Optional Title Here"
    This is [an example][id] reference-style link.

预览：

---

[id]: http://example.com/ "Optional Title Here"

This is [an example][id] reference-style link.

---

也就是说：

- 方括号包含链接标识（**不区分大小写**，可以从左边距缩进最多三个空格）；
- 后跟冒号；
- 后跟一个或多个空格（或制表符）；
- 后跟链接的 URL；
- URL 可以可选地用尖括号括起来。
- 可选地后跟链接标题属性，用双引号、单引号或括号括起来。

下面三个链接定义是等价的：

代码：

    [foo]: http://example.com/  "Optional Title Here"
    [foo]: http://example.com/  'Optional Title Here'
    [foo]: http://example.com/  (Optional Title Here)
    [foo]: <http://example.com/>  "Optional Title Here"

使用空方括号时，链接文字本身作为名称。

代码：

    [Google]: http://google.com/
    [Google][]

预览：

---

[Google]: http://google.com/

[Google][]

---

### 强调

HTML 标签：`<em>`、`<strong>`

Markdown 将**星号（\*）**和**下划线（\_）**视为强调标记。**一个定界符**产生 `<em>`；\*_两个定界符_产生 `<strong>`。

代码：

    *single asterisks*

    _single underscores_

    **double asterisks**

    __double underscores__

预览：

---

_single asterisks_

_single underscores_

**double asterisks**

**double underscores**

---

但如果 \* 或 \_ 周围有空格，就会被当作字面字符处理。

你可以用反斜杠转义它：

代码：

    \*this text is surrounded by literal asterisks\*

预览：

---

\*this text is surrounded by literal asterisks\*

---

### 代码

HTML 标签：`<code>`

用**反引号（`）**包裹。

代码：

    Use the `printf()` function.

预览：

---

Use the `printf()` function.

---

要在代码范围内包含字面反引号字符，可以使用**多个反引号**作为开闭定界符：

代码：

    ``There is a literal backtick (`) here.``

预览：

---

``There is a literal backtick (`) here.``

---

围绕代码范围的反引号定界符可以包含空格——开头一个、结尾一个。这样可以在一段代码范围的首尾放置字面反引号字符：

代码：

    A single backtick in a code span: `` ` ``

    A backtick-delimited string in a code span: `` `foo` ``

预览：

---

A single backtick in a code span: `` ` ``

A backtick-delimited string in a code span: `` `foo` ``

---

### 图片

HTML 标签：`<img />`

Markdown 使用类似链接的图片语法，支持行内和引用两种风格。

#### 行内

行内图片语法：`![Alt text](URL "Title")`

标题是可选的。

代码：

    ![Alt text](/path/to/img.jpg)

    ![Alt text](/path/to/img.jpg "Optional title")

预览：

---

![Alt text](/images/posts/markdown-tutorial-sample.webp)

![Alt text](/images/posts/markdown-tutorial-sample.webp "Optional title")

---

也就是说：

- 感叹号：!；
- 后跟一组方括号，包含图片的 alt 属性文本；
- 后跟一组圆括号，包含图片的 URL 或路径，以及可选的双引号或单引号括起来的标题属性。

#### 引用

引用风格的图片语法：`![Alt text][id]`

代码：

    [img id]: /images/posts/markdown-tutorial-sample.webp  "Optional title attribute"
    ![Alt text][img id]

预览：

---

[img id]: /images/posts/markdown-tutorial-sample.webp "Optional title attribute"

![Alt text][img id]

---

### 删除线

HTML 标签：`<del>`

这是一种扩展。

GFM 为删除线文本添加了语法。

代码：

```
~~Mistaken text.~~
```

预览：

---

~~Mistaken text.~~

---

## 其他

### 自动链接

Markdown 支持为 URL 和电子邮件地址创建「自动」链接：只需用尖括号括住 URL 或电子邮件地址。

代码：

    <http://example.com/>

    <address@example.com>

预览：

---

<http://example.com/>

<address@example.com>

---

GFM 会自动链接标准 URL。

代码：

```
https://github.com/emn178/markdown
```

预览：

---

https://github.com/emn178/markdown

---

### 反斜杠转义

Markdown 允许你使用反斜杠转义，来生成本应在 Markdown 格式语法中具有特殊含义的字面字符。

代码：

    \*literal asterisks\*

预览：

---

\*literal asterisks\*

---

Markdown 为以下字符提供反斜杠转义：

代码：

    \   backslash
    `   backtick
    *   asterisk
    _   underscore
    {}  curly braces
    []  square brackets
    ()  parentheses
    #   hash mark
    +   plus sign
    -   minus sign (hyphen)
    .   dot
    !   exclamation mark

## 行内 HTML

对于 Markdown 语法未覆盖的标记，直接使用 HTML 本身即可。无需在前面加上前缀或分隔符，直接用标签即可。

代码：

    This is a regular paragraph.

    <table>
        <tr>
            <td>Foo</td>
        </tr>
    </table>

    This is another regular paragraph.

预览：

---

This is a regular paragraph.

<table>
    <tr>
        <td>Foo</td>
    </tr>
</table>

This is another regular paragraph.

---

注意：Markdown 格式语法**不会在块级 HTML 标签内处理**。

与块级 HTML 标签不同，**行内级标签内**会处理 Markdown 语法。

代码：

    <span>**Work**</span>

    <div>
        **No Work**
    </div>

预览：

---

<span>**Work**</span>

<div>
  **No Work**
</div>
