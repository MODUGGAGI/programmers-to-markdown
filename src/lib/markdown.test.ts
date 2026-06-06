import { describe, expect, it } from "vitest";
import { generateNotionMarkdown, markdownTableToExamples } from "./markdown";
import { createEmptyProblem } from "./problem";

describe("generateNotionMarkdown", () => {
  it("keeps the Notion template section order and Java code blocks", () => {
    const markdown = generateNotionMarkdown(
      createEmptyProblem({
        url: "https://school.programmers.co.kr/learn/courses/30/lessons/12901",
        problemNumber: "12901",
        title: "2016년",
        description: "문제 설명입니다.",
        constraints: "a와 b는 정수입니다.",
        examples: {
          headers: ["a", "b", "result"],
          rows: [["5", "24", "\"TUE\""]],
        },
        exampleExplanation: "2016년 5월 24일은 화요일입니다.",
      }),
    );

    expect(markdown).toContain("# 2016년\n- 문제 번호: 12901");
    expect(markdown).toContain("### 문제 설명\n문제 설명입니다.");
    expect(markdown).toContain("| a | b | result |");
    expect(markdown).toContain("| 5 | 24 | \"TUE\" |");
    expect(markdown.indexOf("### 문제 설명")).toBeLessThan(markdown.indexOf("### 제한사항"));
    expect(markdown.indexOf("### 제한사항")).toBeLessThan(markdown.indexOf("### 입출력 예"));
    expect(markdown.indexOf("### 입출력 예")).toBeLessThan(markdown.indexOf("### 입출력 예 설명"));
    expect(markdown).toContain("### 처음에 내가 짠 코드\n```java\n\n```");
    expect(markdown).toContain("### 답 코드\n```java\n\n```");
  });

  it("does not break when optional fields are blank", () => {
    const markdown = generateNotionMarkdown(createEmptyProblem());

    expect(markdown).toContain("### 문제 설명");
    expect(markdown).toContain("### 입출력 예\n");
  });

  it("parses an editable markdown table back into examples", () => {
    expect(
      markdownTableToExamples(`| a | b | result |
| --- | --- | --- |
| 5 | 24 | "TUE" |`),
    ).toEqual({
      headers: ["a", "b", "result"],
      rows: [["5", "24", "\"TUE\""]],
    });
  });
});
