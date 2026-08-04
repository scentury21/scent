export type ProductNotes = {
  top: string[];
  heart: string[];
  base: string[];
};

export type Review = {
  author: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
};

export type Product = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  family: string;
  size: string;
  price: number;
  stock: number;
  rating: number;
  reviewsCount: number;
  reviews: Review[];
  notes: ProductNotes;
  description: string;
  palette: [string, string, string];
  tag?: "Bestseller" | "New" | "Limited";
  featured?: boolean;
};

export type CartItem = {
  productId: string;
  qty: number;
};

export type DeliveryInfo = {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  postal: string;
  address: string;
  landmark: string;
  notes: string;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  size: string;
};

export type Order = {
  id: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: "NGN";
  delivery: DeliveryInfo;
  payment: { method: string; status: "paid" | "pending"; reference: string };
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  orders: number;
  totalSpent: number;
  joined: string;
};
