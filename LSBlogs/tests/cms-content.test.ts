import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSiteConfig,
  parseTypescriptArray,
  serializeAlbums,
  serializeSiteConfig,
} from "../lib/cms/content";

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
