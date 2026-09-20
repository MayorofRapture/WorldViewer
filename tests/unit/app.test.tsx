import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import App from "../../src/app/App";

test("the foundation shell renders the application name inside its main landmark", () => {
  const markup = renderToStaticMarkup(<App />);

  expect(markup).toMatch(/^<main><h1>WorldViewer<\/h1>/);
  expect(markup).toContain("<p>Application foundation.</p>");
  expect(markup).toMatch(/<\/main>$/);
});
