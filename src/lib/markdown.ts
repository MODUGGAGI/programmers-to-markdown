import type { ExampleTable, ProblemData } from "./problem";

function clean(value: string) {
  return value.trim();
}

function fenceFor(value: string) {
  const longestBacktickRun = Math.max(2, ...[...value.matchAll(/`+/g)].map((match) => match[0].length));

  return "`".repeat(longestBacktickRun + 1);
}

function fenced(value: string, language = "plain text") {
  const cleanedValue = clean(value);
  const fence = fenceFor(cleanedValue);

  return `${fence}${language}\n${cleanedValue}\n${fence}`;
}

function escapeTableCell(value: string) {
  return clean(value).replace(/\|/g, "\\|").replace(/\n/g, "<br />");
}

export function examplesToMarkdownTable(examples: ExampleTable) {
  const headers = examples.headers.map(clean).filter(Boolean);
  const rows = examples.rows
    .map((row) => row.map(clean))
    .filter((row) => row.some(Boolean));

  if (headers.length === 0 && rows.length === 0) {
    return "";
  }

  const columnCount = Math.max(headers.length, ...rows.map((row) => row.length), 1);
  const normalizedHeaders = Array.from({ length: columnCount }, (_, index) => headers[index] || `값 ${index + 1}`);
  const normalizedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || ""));

  return [
    `| ${normalizedHeaders.map(escapeTableCell).join(" | ")} |`,
    `| ${normalizedHeaders.map(() => "---").join(" | ")} |`,
    ...normalizedRows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`),
  ].join("\n");
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").replace(/<br\s*\/?>/gi, "\n").trim());
}

export function markdownTableToExamples(value: string): ExampleTable {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const contentLines = lines.filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line));

  if (contentLines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitTableRow(contentLines[0]).filter(Boolean);
  const rows = contentLines
    .slice(1)
    .map(splitTableRow)
    .filter((row) => row.some(Boolean));

  return { headers, rows };
}

export function generateNotionMarkdown(problem: ProblemData) {
  const metadata = [
    clean(problem.title) ? `# ${clean(problem.title)}` : "",
    clean(problem.problemNumber) ? `- 문제 번호: ${clean(problem.problemNumber)}` : "",
    clean(problem.url) ? `- 문제 링크: ${clean(problem.url)}` : "",
  ].filter(Boolean);

  return [
    ...metadata,
    ...(metadata.length > 0 ? [""] : []),
    "### 문제 설명",
    clean(problem.description),
    "",
    "### 제한사항",
    clean(problem.constraints),
    "",
    "### 입출력 예",
    examplesToMarkdownTable(problem.examples),
    "",
    "### 입출력 예 설명",
    clean(problem.exampleExplanation),
    "",
    "---",
    "### 처음에 내가 짠 코드",
    fenced("", "java"),
    "- 잘못된 부분",
    "### 답 코드",
    fenced("", "java"),
    "### 배운 점 기록",
    "",
  ].join("\n");
}
