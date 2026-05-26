export type DrillingProduct = {
  id: string;
  name: string;
  size: string;
  image: string;
};

export const PRODUCTS: readonly DrillingProduct[] = [
  { id: "Special Milling Panel", name: "", size: "397.5 × 779 × 19 mm",   image: "/products/special-milling-panel.png" },
  { id: "Sliding Door",          name: "", size: "1051 × 568.5 × 16 mm",  image: "/products/sliding-door.png" },
  { id: "Hinge Door",            name: "", size: "702 × 368 × 17 mm",     image: "/products/hinge-door.png" },
  { id: "Fixed Shelf",           name: "", size: "381 × 387 × 16 mm",     image: "/products/fixed-shelf.png" },
  { id: "Tall Cabinet Side",     name: "", size: "2125 × 560 × 16 mm",    image: "/products/tall-cabinet-side.png" },
  { id: "Middle Base w/ Groove", name: "", size: "667 × 559 × 16 mm",     image: "/products/middle-base-groove.png" },
  { id: "Plinth Front",          name: "", size: "741.6 × 57.3 × 19 mm",  image: "/products/plinth-front.png" },
  { id: "Drawer Front",          name: "", size: "368 × 115.3 × 17 mm",   image: "/products/drawer-front.png" },
  { id: "Cabinet Side",          name: "", size: "1058 × 379.5 × 23 mm",  image: "/products/cabinet-side.png" },
];
