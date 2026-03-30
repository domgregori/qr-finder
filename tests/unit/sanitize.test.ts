import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeInput,
  sanitizeNickname,
  sanitizeMessage,
  sanitizeDeviceName,
  sanitizeDescription,
  sanitizeUrl,
} from "../../packages/shared/lib/sanitize";

describe("escapeHtml", () => {
  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("returns empty string for non-string input", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(null as unknown as string)).toBe("");
  });
});

describe("sanitizeInput", () => {
  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeInput("abcdef", 3)).toBe("abc");
  });

  it("removes null bytes", () => {
    expect(sanitizeInput("hello\x00world")).toBe("helloworld");
  });

  it("removes control characters but keeps newlines", () => {
    expect(sanitizeInput("hello\x08world")).toBe("helloworld");
  });

  it("escapes HTML in the output", () => {
    expect(sanitizeInput("<b>bold</b>")).toBe("&lt;b&gt;bold&lt;&#x2F;b&gt;");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeInput("")).toBe("");
    expect(sanitizeInput(null as unknown as string)).toBe("");
  });

  it("uses default maxLength of 1000", () => {
    const long = "a".repeat(1001);
    expect(sanitizeInput(long)).toHaveLength(1000);
  });
});

describe("sanitizeNickname", () => {
  it("limits to 50 characters", () => {
    expect(sanitizeNickname("a".repeat(60))).toHaveLength(50);
  });

  it("removes all control characters including newlines", () => {
    expect(sanitizeNickname("hello\nworld")).toBe("helloworld");
  });

  it("escapes HTML", () => {
    expect(sanitizeNickname("<Alice>")).toBe("&lt;Alice&gt;");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeNickname("")).toBe("");
  });
});

describe("sanitizeMessage", () => {
  it("limits to 200 characters", () => {
    expect(sanitizeMessage("a".repeat(250))).toHaveLength(200);
  });

  it("escapes HTML", () => {
    expect(sanitizeMessage("<script>alert(1)</script>")).toContain("&lt;script&gt;");
  });
});

describe("sanitizeDeviceName", () => {
  it("limits to 100 characters", () => {
    expect(sanitizeDeviceName("a".repeat(150))).toHaveLength(100);
  });
});

describe("sanitizeDescription", () => {
  it("limits to 500 characters", () => {
    expect(sanitizeDescription("a".repeat(600))).toHaveLength(500);
  });
});

describe("sanitizeUrl", () => {
  it("accepts http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("accepts ntfy:// scheme", () => {
    expect(sanitizeUrl("ntfy://topic")).toBe("ntfy://topic");
  });

  it("accepts ntfys:// scheme", () => {
    expect(sanitizeUrl("ntfys://topic")).toBe("ntfys://topic");
  });

  it("accepts tgram:// scheme", () => {
    expect(sanitizeUrl("tgram://bottoken/chatid")).toBe("tgram://bottoken/chatid");
  });

  it("rejects javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("rejects bare strings without a scheme", () => {
    expect(sanitizeUrl("example.com")).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("limits to 500 characters", () => {
    const url = "https://example.com/" + "a".repeat(490);
    expect(sanitizeUrl(url)).toHaveLength(500);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeUrl("")).toBe("");
    expect(sanitizeUrl(null as unknown as string)).toBe("");
  });
});
