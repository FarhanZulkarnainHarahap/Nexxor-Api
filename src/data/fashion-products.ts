export const fashionCategories = [
  { name: "Jackets", description: "Layering essentials for polished everyday looks." },
  { name: "Hoodies", description: "Comfort-first staples with a modern streetwear fit." },
  { name: "T-Shirts", description: "Versatile tees made for effortless daily styling." },
  { name: "Pants", description: "Clean silhouettes for work, weekends, and everything between." },
  { name: "Sneakers", description: "Comfortable footwear built for all-day movement." },
  { name: "Bags", description: "Functional carry pieces with understated design." },
  { name: "Accessories", description: "Finishing details that make an outfit feel complete." },
  { name: "Shirts", description: "Smart-casual shirts for a refined wardrobe rotation." },
] as const;

type FashionProductSeed = {
  name: string;
  category: (typeof fashionCategories)[number]["name"];
  price: number;
  stock: number;
  rating: number;
  sold: number;
  image: string;
  material: string;
  tags: string[];
  isFeatured?: boolean;
};

const images = {
  jacket: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=82",
  hoodie: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=82",
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=82",
  shirt: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1200&q=82",
  pants: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=82",
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=82",
  bag: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=82",
  accessory: "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=1200&q=82",
} as const;

export const fashionProducts: FashionProductSeed[] = [
  { name: "Jacket Bomber Black", category: "Jackets", price: 280000, stock: 29, rating: 4.9, sold: 186, image: images.jacket, material: "Premium nylon twill with smooth polyester lining", tags: ["bomber", "streetwear", "black"], isFeatured: true },
  { name: "Oversized Hoodie Cream", category: "Hoodies", price: 245000, stock: 35, rating: 4.8, sold: 241, image: images.hoodie, material: "Heavyweight cotton fleece, 320 GSM", tags: ["oversized", "cream", "unisex"], isFeatured: true },
  { name: "Streetwear Hoodie Charcoal", category: "Hoodies", price: 265000, stock: 21, rating: 4.7, sold: 157, image: images.hoodie, material: "Brushed cotton fleece, 330 GSM", tags: ["streetwear", "charcoal", "hoodie"] },
  { name: "Basic T-Shirt White", category: "T-Shirts", price: 99000, stock: 80, rating: 4.6, sold: 532, image: images.tshirt, material: "Combed cotton, 200 GSM", tags: ["basic", "white", "essential"] },
  { name: "Heavyweight T-Shirt Black", category: "T-Shirts", price: 145000, stock: 52, rating: 4.8, sold: 389, image: images.tshirt, material: "Heavyweight compact cotton, 260 GSM", tags: ["heavyweight", "black", "relaxed"], isFeatured: true },
  { name: "Flannel Shirt Brown", category: "Shirts", price: 210000, stock: 18, rating: 4.7, sold: 128, image: images.shirt, material: "Soft brushed cotton flannel", tags: ["flannel", "brown", "layering"] },
  { name: "Oxford Shirt Sky Blue", category: "Shirts", price: 195000, stock: 24, rating: 4.6, sold: 104, image: images.shirt, material: "Breathable cotton Oxford weave", tags: ["oxford", "blue", "smart-casual"] },
  { name: "Cargo Pants Olive", category: "Pants", price: 275000, stock: 32, rating: 4.8, sold: 218, image: images.pants, material: "Durable cotton ripstop with light stretch", tags: ["cargo", "olive", "utility"], isFeatured: true },
  { name: "Slim Chino Pants Khaki", category: "Pants", price: 230000, stock: 27, rating: 4.7, sold: 176, image: images.pants, material: "Cotton twill with elastane", tags: ["chino", "khaki", "slim"] },
  { name: "Relaxed Denim Jeans", category: "Pants", price: 320000, stock: 19, rating: 4.8, sold: 149, image: images.pants, material: "Midweight washed cotton denim", tags: ["denim", "relaxed", "jeans"], isFeatured: true },
  { name: "Classic White Sneakers", category: "Sneakers", price: 399000, stock: 25, rating: 4.9, sold: 294, image: images.sneakers, material: "Synthetic leather upper with rubber outsole", tags: ["white", "classic", "sneakers"], isFeatured: true },
  { name: "Runner Sneakers Grey", category: "Sneakers", price: 450000, stock: 16, rating: 4.7, sold: 133, image: images.sneakers, material: "Engineered mesh with cushioned EVA midsole", tags: ["runner", "grey", "sport"] },
  { name: "Canvas Sneakers Black", category: "Sneakers", price: 299000, stock: 38, rating: 4.6, sold: 207, image: images.sneakers, material: "Cotton canvas upper with vulcanized sole", tags: ["canvas", "black", "casual"] },
  { name: "Minimal Backpack Navy", category: "Bags", price: 285000, stock: 20, rating: 4.8, sold: 168, image: images.bag, material: "Water-resistant polyester with padded lining", tags: ["backpack", "navy", "laptop"], isFeatured: true },
  { name: "Sling Bag Black", category: "Bags", price: 175000, stock: 44, rating: 4.7, sold: 312, image: images.bag, material: "Water-repellent nylon with metal hardware", tags: ["sling", "black", "compact"] },
  { name: "Tote Bag Canvas", category: "Bags", price: 125000, stock: 60, rating: 4.6, sold: 276, image: images.bag, material: "Heavy-duty natural cotton canvas", tags: ["tote", "canvas", "daily"] },
  { name: "Baseball Cap Beige", category: "Accessories", price: 85000, stock: 75, rating: 4.5, sold: 361, image: images.accessory, material: "Washed cotton twill", tags: ["cap", "beige", "adjustable"] },
  { name: "Beanie Hat Dark Grey", category: "Accessories", price: 79000, stock: 41, rating: 4.6, sold: 194, image: images.accessory, material: "Soft rib-knit acrylic", tags: ["beanie", "grey", "knit"] },
  { name: "Leather Belt Brown", category: "Accessories", price: 135000, stock: 33, rating: 4.7, sold: 142, image: images.accessory, material: "Genuine leather with brushed metal buckle", tags: ["belt", "brown", "leather"] },
  { name: "Coach Jacket Navy", category: "Jackets", price: 295000, stock: 22, rating: 4.8, sold: 171, image: images.jacket, material: "Water-resistant nylon shell with mesh lining", tags: ["coach", "navy", "lightweight"], isFeatured: true },
  { name: "Windbreaker Jacket Grey", category: "Jackets", price: 310000, stock: 17, rating: 4.7, sold: 121, image: images.jacket, material: "Lightweight windproof technical fabric", tags: ["windbreaker", "grey", "technical"] },
  { name: "Knit Sweater Sand", category: "Hoodies", price: 225000, stock: 26, rating: 4.6, sold: 117, image: images.hoodie, material: "Soft cotton-acrylic knit blend", tags: ["knit", "sand", "sweater"] },
  { name: "Graphic T-Shirt Vintage", category: "T-Shirts", price: 135000, stock: 49, rating: 4.7, sold: 328, image: images.tshirt, material: "Garment-dyed combed cotton, 220 GSM", tags: ["graphic", "vintage", "washed"] },
  { name: "Utility Vest Black", category: "Jackets", price: 260000, stock: 14, rating: 4.8, sold: 96, image: images.jacket, material: "Durable cotton-nylon utility weave", tags: ["vest", "utility", "black"] },
];

export function fashionProductDetails(product: FashionProductSeed) {
  return {
    description: `${product.name} is a curated Nexxora essential designed for versatile everyday styling, reliable comfort, and easy wardrobe rotation.`,
    overview: `A modern ${product.category.toLowerCase()} staple with a clean silhouette and considered everyday details.`,
    keyFeatures: [
      "Comfortable everyday fit",
      "Durable construction and neat finishing",
      "Easy to combine with your existing wardrobe",
      "Quality checked before shipping",
    ],
    sizeGuide: "Available in S–XXL. Choose your regular size for a relaxed fit or size down for a closer fit.",
    careInstructions: "Wash with similar colors on a gentle cycle. Do not bleach. Air dry in shade and use low heat when ironing.",
    warranty: "7-day size exchange and return support for unused items with original tags attached.",
    gallery: [product.image],
  };
}
