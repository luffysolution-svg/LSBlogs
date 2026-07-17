import assert from "node:assert/strict";
import test from "node:test";
import {
  draftToMarkdown,
  parseSiteConfig,
  parseTypescriptArray,
  richTextToMarkdown,
  serializeAlbums,
  serializeSiteConfig,
} from "../lib/cms/content";

test("writes multiple normalized article bookmarks to frontmatter", () => {
  const document = draftToMarkdown({
    type: "post",
    id: "tagged-post",
    title: "Tagged",
    tags: ["#React", " React ", "Next.js", ""],
    content: "<p>Body</p>",
  });

  assert.match(document.content, /tags:\n\s+- "React"\n\s+- "Next\.js"/);
});

test("preserves rich editor formats when converting content to markdown", () => {
  const markdown = richTextToMarkdown(`
    <p style="text-align: center"><strong>Centered</strong> H<sub>2</sub>O</p>
    <p><span style="color: #6366F1; font-size: 24px"><u>Styled</u></span> x<sup>2</sup> <mark style="background-color: #FEF08A">Focus</mark></p>
    <img src="https://example.com/image.png" alt="demo" style="width: 50%; height: auto">
    <pre><code class="language-ts">const answer = 42;</code></pre>
  `);

  assert.match(markdown, /<p style="text-align: center;"><strong>Centered<\/strong> H<sub>2<\/sub>O<\/p>/);
  assert.match(markdown, /<span style="color: #6366F1; font-size: 24px;"><u>Styled<\/u><\/span>/);
  assert.match(markdown, /x<sup>2<\/sup> <mark style="background-color: #FEF08A;">Focus<\/mark>/);
  assert.match(markdown, /<img src="https:\/\/example\.com\/image\.png" alt="demo" style="width: 50%; height: auto;">/);
  assert.match(markdown, /```ts\nconst answer = 42;\n```/);
});

test("reads a generated site config after its type declaration", () => {
  const source = serializeSiteConfig({
    title: "Test blog",
    cloudMusicIds: ["1809646618", "3361076230"],
  });

  assert.deepEqual(parseSiteConfig(source).cloudMusicIds, ["1809646618", "3361076230"]);
});

test("uses the first photo as the album cover when cover is missing", () => {
  const source = serializeAlbums([
    {
      id: "footprints",
      title: "足迹",
      description: "一段承载岁月的图集",
      date: "2026-07-17",
      photos: [{ url: "https://example.com/footprints.jpg", caption: "湿地公园" }],
    },
  ]);
  const albums = parseTypescriptArray(source, "albums") as Array<{ cover: string }>;

  assert.equal(albums[0].cover, "https://example.com/footprints.jpg");
});

test("keeps an explicitly selected album cover", () => {
  const source = serializeAlbums([
    {
      id: "footprints",
      title: "足迹",
      description: "一段承载岁月的图集",
      cover: "https://example.com/cover.jpg",
      date: "2026-07-17",
      photos: [{ url: "https://example.com/photo.jpg" }],
    },
  ]);
  const albums = parseTypescriptArray(source, "albums") as Array<{ cover: string }>;

  assert.equal(albums[0].cover, "https://example.com/cover.jpg");
});
