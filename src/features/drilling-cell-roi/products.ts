import { PRODUCT_IMAGES } from "./product-images";

export type DrillingProduct = {
  id: string;
  name: string;
  size: string;
  image: string;
};

const PRODUCT_META: Array<Omit<DrillingProduct, "image"> & { imageIndex: number }> = [
  { id: "Special Milling Panel", name: "", size: "397.5 × 779 × 19 mm", imageIndex: 0 },
  { id: "Sliding Door", name: "", size: "1051 × 568.5 × 16 mm", imageIndex: 1 },
  { id: "Hinge Door", name: "", size: "702 × 368 × 17 mm", imageIndex: 2 },
  { id: "Fixed Shelf", name: "", size: "381 × 387 × 16 mm", imageIndex: 3 },
  { id: "Tall Cabinet Side", name: "", size: "2125 × 560 × 16 mm", imageIndex: 4 },
  { id: "Middle Base w/ Groove", name: "", size: "667 × 559 × 16 mm", imageIndex: 5 },
  { id: "Plinth Front", name: "", size: "741.6 × 57.3 × 19 mm", imageIndex: 7 },
  { id: "Drawer Front", name: "", size: "368 × 115.3 × 17 mm", imageIndex: 9 },
  { id: "Cabinet Side", name: "", size: "1058 × 379.5 × 23 mm", imageIndex: 10 },
];

export const PRODUCTS: readonly DrillingProduct[] = PRODUCT_META.map((p) => ({
  id: p.id,
  name: p.name,
  size: p.size,
  image: PRODUCT_IMAGES[p.imageIndex] ?? "",
}));
