import assert from "node:assert/strict";
import test from "node:test";
import { buildGithubTreeEntries } from "../lib/cms/github";

test("omits a deletion when the file is already absent", () => {
  const tree = buildGithubTreeEntries(
    [
      { path: "moments/removed.md", content: null },
      { path: "moments/new.md", content: "new content" },
    ],
    "",
    new Set(),
  );

  assert.deepEqual(tree, [
    {
      path: "moments/new.md",
      mode: "100644",
      type: "blob",
      content: "new content",
    },
  ]);
});

test("keeps a deletion when the file exists under the repository root", () => {
  const tree = buildGithubTreeEntries(
    [{ path: "moments/existing.md", content: null }],
    "LSBlogs",
    new Set(["LSBlogs/moments/existing.md"]),
  );

  assert.deepEqual(tree, [
    {
      path: "LSBlogs/moments/existing.md",
      mode: "100644",
      type: "blob",
      sha: null,
    },
  ]);
});
