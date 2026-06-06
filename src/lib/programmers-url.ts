export type ProgrammersUrlInfo = {
  normalizedUrl: string;
  problemNumber: string;
};

const PROGRAMMERS_HOST = "school.programmers.co.kr";
const LESSON_PATH_PATTERN = /^\/learn\/courses\/[^/]+\/lessons\/(\d+)\/?$/;

export function parseProgrammersUrl(rawUrl: string): ProgrammersUrlInfo | null {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== PROGRAMMERS_HOST) {
    return null;
  }

  const match = url.pathname.match(LESSON_PATH_PATTERN);

  if (!match) {
    return null;
  }

  url.hash = "";

  return {
    normalizedUrl: url.toString(),
    problemNumber: match[1],
  };
}
