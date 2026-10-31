// Shared entity types — mirror the backend (NestJS + Prisma) contract.

export type Role = "student" | "club_lead" | "mess_admin" | "moderator" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  rollNo?: string;
  branch?: string;
  year?: number;
  hostel?: string;
  role: Role;
  clubIds: string[]; // clubs the user leads
}

export type MealPeriod = "breakfast" | "lunch" | "snacks" | "dinner";

export interface Dish {
  id: string;
  name: string;
  veg: boolean;
  description?: string;
  avgRating: number;
  ratingCount: number;
}

export interface Meal {
  period: MealPeriod;
  start: string; // "07:30"
  end: string;
  dishes: Dish[];
}

export interface DailyMenu {
  date: string; // YYYY-MM-DD
  published: boolean;
  meals: Meal[];
}

export interface DishRatingInput {
  dishId: string;
  date: string;
  period: MealPeriod;
  stars: number;
  comment?: string | undefined;
}

export interface DishRating extends DishRatingInput {
  id: string;
  userId: string;
  dishName: string;
  createdAt: string;
}

export interface RatingHistory {
  monthly: { month: string; avg: number; count: number }[];
  top: { name: string; avg: number; count: number }[];
  bottom: { name: string; avg: number; count: number }[];
  mine: DishRating[];
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  scope: "campus" | "mess" | "club";
  createdAt: string;
  important?: boolean;
}

export type ClubCategory = "technical" | "cultural" | "sports" | "other";

export interface ClubMember {
  name: string;
  role: "lead" | "co-lead";
  contact: string;
}

export interface Club {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ClubCategory;
  coordinator: string;
  leads: string[];
  members: number;
  recruiting: boolean;
  color: string; // chart token index 1-5
  clubMembers?: ClubMember[];
}

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName?: string | undefined;
  title: string;
  description: string;
  date: string; // ISO
  venue: string;
  deadline: string; // ISO
  capacity?: number | null | undefined;
  registered: number;
  attended?: number | undefined;
  isUnlimited?: boolean | undefined;
}

export interface Announcement {
  id: string;
  clubId: string;
  title: string;
  body: string;
  createdAt: string;
}

export type RegistrationStatus = "registered" | "waitlisted" | "cancelled";

export interface Registration {
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: string;
}

export type ListingCategory = "textbooks" | "calculators" | "electronics" | "stationery" | "hostel";
export type ListingCondition = "new" | "like_new" | "good" | "fair";
export type ListingStatus = "available" | "reserved" | "sold" | "removed";

export interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  price: number;
  images: string[];
  status: ListingStatus;
  createdAt: string;
  reports: number;
}

export interface ListingInput {
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  price: number;
  images: string[];
}

export interface ItemRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRollNo?: string | undefined;
  requesterContact?: string | undefined;
  title: string;
  description: string;
  category: ListingCategory;
  budget: number;
  status: "open" | "fulfilled" | "cancelled";
  createdAt: string;
}

export interface ItemRequestInput {
  title: string;
  description: string;
  category: ListingCategory;
  budget: number;
  contact?: string | undefined;
}

export type RequestStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";

export interface PurchaseRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Report {
  id: string;
  listingId: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  createdAt: string;
  read: boolean;
}
