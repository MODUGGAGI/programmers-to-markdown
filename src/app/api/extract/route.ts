import { NextResponse } from "next/server";
import { createEmptyProblem, MANUAL_REQUIRED_FIELDS, type ExtractionResult } from "@/lib/problem";
import { parseProgrammersHtml } from "@/lib/programmers-parser";
import { parseProgrammersUrl } from "@/lib/programmers-url";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 2_000_000;

function failedResult(url: string, message: string): ExtractionResult {
  return {
    status: "failed",
    data: createEmptyProblem({ url }),
    missingFields: MANUAL_REQUIRED_FIELDS,
    message,
  };
}

async function readLimitedText(response: Response) {
  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_HTML_BYTES) {
    throw new Error("response-too-large");
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_HTML_BYTES) {
      throw new Error("response-too-large");
    }

    chunks.push(value);
  }

  const html = new Uint8Array(totalBytes);
  let offset = 0;

  chunks.forEach((chunk) => {
    html.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return new TextDecoder("utf-8").decode(html);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failedResult("", "요청 형식이 올바르지 않습니다."), { status: 400 });
  }

  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    return NextResponse.json(failedResult("", "프로그래머스 문제 URL을 입력해주세요."), { status: 400 });
  }

  const urlInfo = parseProgrammersUrl(body.url);

  if (!urlInfo) {
    return NextResponse.json(failedResult(body.url ?? "", "프로그래머스 문제 URL을 입력해주세요."), { status: 400 });
  }

  try {
    const response = await fetch(urlInfo.normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        failedResult(urlInfo.normalizedUrl, `프로그래머스 페이지를 가져오지 못했습니다. (${response.status})`),
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return NextResponse.json(failedResult(urlInfo.normalizedUrl, "프로그래머스 HTML 페이지가 아닙니다."), { status: 502 });
    }

    const html = await readLimitedText(response);

    return NextResponse.json(parseProgrammersHtml(html, urlInfo.normalizedUrl));
  } catch {
    return NextResponse.json(
      failedResult(urlInfo.normalizedUrl, "자동 추출에 실패했습니다. 수동 입력으로 계속 진행할 수 있습니다."),
      { status: 502 },
    );
  }
}
