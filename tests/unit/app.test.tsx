import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import App from "../../src/app/App";

describe("App Foundation", () => {
  it("renders the application name inside its main landmark", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("WorldViewer");
    expect(markup).toContain("Application foundation.");
  });
});
