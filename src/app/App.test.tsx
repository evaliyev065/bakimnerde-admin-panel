import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Admin panel routing", () => {
  it("genel bakış ekranını ve ana aksiyonu gösterir", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /İyi akşamlar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yeni bakım talebi/ })).toBeInTheDocument();
  });
});
