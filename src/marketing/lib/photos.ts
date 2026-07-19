// Curated Unsplash URLs — real premium photography for VULO marketing site.
// Hotlink is permitted by Unsplash; we resize/format on the fly with query params.

export const photo = (id: string, w = 1600, q = 80) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const PHOTOS = {
  // Lobbies & receptions
  lobbyBoutique: "photo-1566073771259-6a8506099945", // hotel lobby modern
  lobbyWarm: "photo-1590490360182-c33d57733427",
  reception: "photo-1551882547-ff40c63fe5fa",
  receptionDesk: "photo-1445019980597-93fa8acb246c",
  // Rooms
  suite: "photo-1611892440504-42a792e24d32",
  bedroomLuxe: "photo-1618773928121-c32242e63f39",
  bedroomLight: "photo-1590490359854-dfba19688d70",
  bathroomSpa: "photo-1552321554-5fefe8c9ef14",
  // People at work
  tabletHands: "photo-1573497019940-1c28c88b4f3e",
  laptopWorking: "photo-1552664730-d307ca884978",
  managerPortrait: "photo-1573496359142-b8d87734a5a2",
  receptionistWoman: "photo-1560472354-b33ff0c44a43",
  housekeeperCart: "photo-1631049307264-da0ec9d70304",
  chefKitchen: "photo-1577219491135-ce391730fb2c",
  // Guests
  guestCheckin: "photo-1568084680786-a84f91d1153c",
  coupleArrive: "photo-1520250497591-112f2f40a3f4",
  // Restaurant
  restaurant: "photo-1414235077428-338989a2e8c0",
  cafeCoffee: "photo-1445116572660-236099ec97a0",
  // Beach / boutique context
  poolside: "photo-1571003123894-1f0594d2b5d9",
  beachResort: "photo-1520250497591-112f2f40a3f4",
  // Interior detail
  detailPlant: "photo-1560448204-e02f11c3d0e2",
  city: "photo-1522708323590-d24dbb6b0267",
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export const photoUrl = (key: PhotoKey, w = 1600, q = 80) =>
  photo(PHOTOS[key], w, q);

export const photoSrcSet = (key: PhotoKey) =>
  [640, 960, 1280, 1600, 2000]
    .map((w) => `${photo(PHOTOS[key], w)} ${w}w`)
    .join(", ");