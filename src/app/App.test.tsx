import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the read-only workspace shell", () => {
    render(<App />);
    expect(screen.getByText("ER Canvas")).toBeInTheDocument();
    expect(screen.getByText("READ ONLY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "测试连接" })).toBeInTheDocument();
  });
});
