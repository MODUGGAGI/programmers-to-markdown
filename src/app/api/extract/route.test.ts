import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/extract", () => {
  it("returns a failed response for non-string url values", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(
      new Request("http://localhost/api/extract", {
        method: "POST",
        body: JSON.stringify({ url: 123 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("failed");
    expect(body.missingFields).toContain("constraints");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
