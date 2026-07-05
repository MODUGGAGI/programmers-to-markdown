import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { createEmptyProblem, getManualMissingFields, type ExampleTable, type ExtractionResult } from "./problem";
import { parseProgrammersUrl } from "./programmers-url";

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveImageUrl(src: string, baseUrl: string) {
  try {
    const url = new URL(src, baseUrl);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function fencedTextBlock(value: string) {
  const text = normalizeText(value);
  const longestBacktickRun = Math.max(2, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longestBacktickRun + 1);

  return `\n${fence}text\n${text}\n${fence}\n`;
}

function escapeMarkdownLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeHtmlText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceImagesWithMarkdown($: cheerio.CheerioAPI, element: cheerio.Cheerio<AnyNode>, baseUrl: string) {
  element.find("img").each((_, image) => {
    const src = $(image).attr("src") ?? "";

    if (!src.trim()) {
      $(image).remove();
      return;
    }

    const resolvedUrl = resolveImageUrl(src, baseUrl);

    if (!resolvedUrl) {
      $(image).remove();
      return;
    }

    const alt = normalizeText($(image).attr("alt") ?? "");
    const markdown = alt ? `![${escapeMarkdownLabel(alt)}](<${resolvedUrl}>)` : `![](<${resolvedUrl}>)`;
    $(image).replaceWith(`\n${escapeHtmlText(markdown)}\n`);
  });
}

function replaceFormattedNodesWithMarkdown($: cheerio.CheerioAPI, element: cheerio.Cheerio<AnyNode>) {
  element.find("pre").each((_, pre) => {
    const code = normalizeText($(pre).text());
    $(pre).replaceWith(code ? fencedTextBlock(code) : "");
  });

  element.find("code").each((_, code) => {
    const text = normalizeText($(code).text());
    if (!text) {
      $(code).replaceWith("");
      return;
    }

    const longestBacktickRun = Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
    const delimiter = "`".repeat(longestBacktickRun + 1);
    const paddedText = text.includes("`") ? ` ${text} ` : text;

    $(code).replaceWith(`${delimiter}${paddedText}${delimiter}`);
  });

  element.find("strong, b").each((_, strong) => {
    const text = normalizeText($(strong).text());
    $(strong).replaceWith(text ? `**${text}**` : "");
  });
}

function nodeText($: cheerio.CheerioAPI, element: AnyNode, baseUrl: string) {
  const $element = $(element);

  if ($element.is("pre")) {
    return normalizeText(fencedTextBlock($element.text()));
  }

  if ($element.is("table")) {
    const rows = $element
      .find("tr")
      .toArray()
      .map((row) =>
        $(row)
          .find("th, td")
          .toArray()
          .map((cell) => normalizeText($(cell).text()))
          .filter(Boolean)
          .join(" | "),
      )
      .filter(Boolean);

    return normalizeText(rows.join("\n"));
  }

  const cloned = $element.clone();
  replaceImagesWithMarkdown($, cloned, baseUrl);
  replaceFormattedNodesWithMarkdown($, cloned);
  cloned.find("br").replaceWith("\n");
  cloned.find("li").each((_, item) => {
    const text = normalizeText($(item).text());
    $(item).replaceWith(`- ${text}\n`);
  });
  cloned.find("p, div").append("\n");

  return normalizeText(cloned.text());
}

function nodeTextBeforeInnerHeading($: cheerio.CheerioAPI, element: AnyNode, baseUrl: string) {
  const cloned = $(element).clone();
  const sectionLabels = ["문제 설명", "제한사항", "제한 조건", "입출력 예", "입출력 예 설명", "입력", "출력"];
  const firstHeading = cloned.find("h1, h2, h3, h4, h5, h6").first();

  if (firstHeading.length === 0) {
    return nodeText($, element, baseUrl);
  }

  const firstHeadingText = normalizeText(firstHeading.text());

  if (!sectionLabels.includes(firstHeadingText)) {
    firstHeading.remove();
  }

  const firstSectionHeading = cloned
    .find("h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((heading) => sectionLabels.includes(normalizeText($(heading).text())));

  if (firstSectionHeading) {
    $(firstSectionHeading).nextAll().remove();
    $(firstSectionHeading).remove();
  }

  return nodeText($, cloned.get(0) ?? element, baseUrl);
}

function sectionText($: cheerio.CheerioAPI, labels: string[], baseUrl: string) {
  const heading = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((candidate) => {
      const text = normalizeText($(candidate).text());
      return labels.some((label) => text === label);
    });

  if (!heading) {
    return "";
  }

  const chunks: string[] = [];
  let current = $(heading).next();

  while (current.length > 0 && !current.is("h1, h2, h3, h4, h5, h6")) {
    const element = current.get(0);
    const hasInnerHeading = current.find("h1, h2, h3, h4, h5, h6").length > 0;
    const text = element ? nodeTextBeforeInnerHeading($, element, baseUrl) : "";

    if (text) {
      chunks.push(text);
    }

    if (hasInnerHeading) {
      break;
    }

    current = current.next();
  }

  return normalizeText(chunks.join("\n\n"));
}

function parseExamples($: cheerio.CheerioAPI): ExampleTable {
  const exampleHeading = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((candidate) => normalizeText($(candidate).text()).includes("입출력 예"));

  if (!exampleHeading) {
    return { headers: [], rows: [] };
  }

  let current = $(exampleHeading).next();

  while (current.length > 0 && !current.is("h1, h2, h3, h4, h5, h6")) {
    if (current.is("table")) {
      const rows = current.find("tr").toArray();
      const headers = rows[0]
        ? $(rows[0])
            .find("th, td")
            .toArray()
            .map((cell) => normalizeText($(cell).text()))
            .filter(Boolean)
        : [];
      const bodyRows = rows
        .slice(1)
        .map((row) =>
          $(row)
            .find("td, th")
            .toArray()
            .map((cell) => normalizeText($(cell).text())),
        )
        .filter((row) => row.some(Boolean));

      if (headers.length > 0 || bodyRows.length > 0) {
        return { headers, rows: bodyRows };
      }
    }

    current = current.next();
  }

  return { headers: [], rows: [] };
}

function parsePlainExampleDescription($: cheerio.CheerioAPI, baseUrl: string) {
  const heading = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((candidate) => normalizeText($(candidate).text()) === "입출력 예");

  if (!heading) {
    return "";
  }

  const chunks: string[] = [];
  let current = $(heading).next();
  let afterTable = false;

  while (current.length > 0 && !current.is("h1, h2, h3, h4, h5, h6")) {
    if (current.is("table")) {
      afterTable = true;
      current = current.next();
      continue;
    }

    if (afterTable) {
      const element = current.get(0);
      const text = element ? nodeText($, element, baseUrl) : "";

      if (text) {
        chunks.push(text);
      }
    }

    current = current.next();
  }

  return normalizeText(chunks.join("\n\n"));
}

function parseLegacyOutput($: cheerio.CheerioAPI, baseUrl: string): ExampleTable {
  const input = sectionText($, ["입력"], baseUrl);
  const output = sectionText($, ["출력"], baseUrl);

  if (!input && !output) {
    return { headers: [], rows: [] };
  }

  return {
    headers: ["입력", "출력"],
    rows: [[input, output]],
  };
}

function parseExamplesWithFallback($: cheerio.CheerioAPI, baseUrl: string) {
  const examples = parseExamples($);

  if (examples.headers.length > 0 || examples.rows.length > 0) {
    return examples;
  }

  return parseLegacyOutput($, baseUrl);
}

function pageTitle($: cheerio.CheerioAPI) {
  const candidates = [
    $("h2").first().text(),
    $("h1").first().text(),
    $("title").text().replace(/코딩테스트 연습\s*-\s*/, "").replace(/\s*\|.*$/, ""),
  ];

  return normalizeText(candidates.find((candidate) => normalizeText(candidate)) ?? "");
}

export function parseProgrammersHtml(html: string, sourceUrl: string): ExtractionResult {
  const urlInfo = parseProgrammersUrl(sourceUrl);
  const $ = cheerio.load(html);
  const normalizedUrl = urlInfo?.normalizedUrl ?? sourceUrl;
  const examples = parseExamplesWithFallback($, normalizedUrl);
  const explicitExampleExplanation = sectionText($, ["입출력 예 설명"], normalizedUrl);
  const data = createEmptyProblem({
    url: normalizedUrl,
    problemNumber: urlInfo?.problemNumber ?? "",
    title: pageTitle($),
    description: sectionText($, ["문제 설명"], normalizedUrl),
    constraints: sectionText($, ["제한사항", "제한 조건"], normalizedUrl),
    examples,
    exampleExplanation: explicitExampleExplanation || parsePlainExampleDescription($, normalizedUrl),
  });
  const missingFields = getManualMissingFields(data);
  const requiredMissing = missingFields.filter((field) => field === "title" || field === "description");
  const status = requiredMissing.length > 0 ? "failed" : missingFields.length === 0 ? "success" : "partial";

  return {
    status,
    data,
    missingFields,
    message:
      status === "success"
        ? "문제 정보를 자동으로 가져왔습니다."
        : "일부 정보를 자동으로 가져오지 못했습니다. 빈 칸을 직접 채워서 사용할 수 있습니다.",
  };
}
