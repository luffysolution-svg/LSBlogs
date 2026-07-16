export interface Photo {
  url: string;
  caption?: string;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  photos: Photo[];
}

export const albums: Album[] = [
  {
    id: "anime-collection",
    title: "次元收藏",
    description: "喜欢的角色、场景与想象力切片。",
    cover: "/images/backgrounds/bg-01-columbina.webp",
    date: "2026.07",
    photos: [
      { url: "/images/backgrounds/bg-01-columbina.webp", caption: "花影" },
      { url: "/images/backgrounds/bg-02-reze.webp", caption: "雨夜" },
      { url: "/images/backgrounds/bg-03-scenery.webp", caption: "远山" },
      { url: "/images/backgrounds/bg-04-gargantua.webp", caption: "星门" },
      { url: "/images/backgrounds/bg-05-cat-girl.webp", caption: "微光" },
      { url: "/images/backgrounds/bg-06-zoro.webp", caption: "剑意" },
      { url: "/images/backgrounds/bg-07-naruto.webp", caption: "风与火" },
      { url: "/images/backgrounds/bg-08-tanjiro.webp", caption: "焰色" },
      { url: "/images/backgrounds/bg-09-gear-five.webp", caption: "无拘" },
      { url: "/images/backgrounds/bg-10-graffiti.webp", caption: "涂鸦" },
    ],
  },
];
