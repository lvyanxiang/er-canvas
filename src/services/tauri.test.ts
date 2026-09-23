import { describe, expect, it } from "vitest";
import { formatCommandError } from "./tauri";

describe("formatCommandError", () => {
  it("formats structured Tauri command errors", () => {
    expect(formatCommandError({
      code: "DB_CONNECTION_FAILED",
      message: "无法连接 PostgreSQL：网络不可达",
    })).toBe("无法连接 PostgreSQL：网络不可达（DB_CONNECTION_FAILED）");
  });

  it("keeps ordinary error messages", () => {
    expect(formatCommandError(new Error("连接超时"))).toBe("连接超时");
  });
});
