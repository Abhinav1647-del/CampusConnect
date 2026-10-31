// SAMPLE DATA ONLY — not official IIIT Nagpur information.
import type {
  Announcement, AppNotification, Club, ClubEvent, DailyMenu, Dish, DishRating, ItemRequest, Listing,
  Meal, MealPeriod, Notice, PurchaseRequest, Registration, Report, User,
} from "@/types";

export const toISODate = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const daysFromNow = (n: number, h = 18, min = 0) => {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, min, 0, 0); return d.toISOString();
};

export const demoUsers: User[] = [
  { id: "u1", name: "Aarav Sharma", email: "bt23cse101@iiitn.ac.in", rollNo: "BT23CSE101", branch: "CSE", year: 2, hostel: "Boys Hostel A", role: "student", clubIds: [] },
  { id: "u2", name: "Diya Patil", email: "bt22ece044@iiitn.ac.in", rollNo: "BT22ECE044", branch: "ECE", year: 3, hostel: "Girls Hostel", role: "club_lead", clubIds: ["c1", "c3", "c7"] },
  { id: "u3", name: "Mr. R. Kulkarni", email: "mess.office@iiitn.ac.in", role: "mess_admin", clubIds: [] },
  { id: "u4", name: "Ishaan Rao", email: "bt22cse077@iiitn.ac.in", rollNo: "BT22CSE077", branch: "CSE", year: 3, hostel: "Boys Hostel B", role: "moderator", clubIds: [] },
  { id: "u5", name: "Dr. Meera Joshi", email: "admin@iiitn.ac.in", rollNo: "FAC-003", branch: "Student Affairs", year: 0, hostel: "—", role: "admin", clubIds: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"] },
];

export function getDishStats(name: string): { avgRating: number; ratingCount: number } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const rating = +(4.0 + ((abs % 9) / 10)).toFixed(1);
  const count = 52 + (abs % 144);
  return { avgRating: rating, ratingCount: count };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const mkDish = (name: string, veg = true): Dish => {
  const stats = getDishStats(name);
  return {
    id: slug(name),
    name,
    veg,
    avgRating: stats.avgRating,
    ratingCount: stats.ratingCount,
  };
};

// Weekly rotating menu (from 01-09-2026 onwards) — MON→SUN pattern
// Daily default items added to each meal automatically
const DAILY_BREAKFAST_DEFAULT = ["Milk, Tea, Coffee Powder, Sugar", "Bread, Butter, Jam"];
const DAILY_LUNCH_DEFAULT = ["Salt, Chilli Powder"];
const DAILY_SNACKS_DEFAULT = ["Tea, Coffee"];
const DAILY_DINNER_DEFAULT = ["Onion, Lemon", "Ghee, Salt, Chilli Powder"];

type WeeklyPlan = {
  breakfast: string[][];
  lunch: string[][];
  snacks: string[][];
  dinner: string[][];
};

const weeklyPlan: WeeklyPlan = {
  // [MON, TUE, WED, THU, FRI, SAT, SUN]
  breakfast: [
    ["Aaloo Paratha, Dahi, Chutney", "Seasonal Fruit"],
    ["Vermicelli Upma", "Coconut Chutney", "Sprouts"],
    ["Veg Uttapam", "Sambhar, Chutney", "Seasonal Fruit"],
    ["Poha - Sev", "Chana Curry", "Sprouts"],
    ["Idli / Vada, Sambhar", "Chutney", "Seasonal Fruit"],
    ["Palak Paratha, Aaloo Sabzi", "Sprouts"],
    ["Masala Dosa", "Sambhar, Chutney", "Seasonal Fruit"],
  ],
  lunch: [
    ["Kadhi Pakoda, Aaloo Gobhi (Dry)", "Chapati, Rice", "Salad, Achar, Papad"],
    ["Sev Tamatar, Chana Daal", "Chapati, Matar Rice", "Salad, Achar", "Dahi"],
    ["Rajma", "Jeera Rice, Chapati", "Salad, Achar", "Chaach"],
    ["Soya Wadi, Masoori Dal", "Chapati, Rice", "Salad, Achar", "Lassi"],
    ["Desi Chana Gravy", "Moong Dal, Chapati, Matar Rice", "Salad, Achar", "Dahi"],
    ["Mix Kathol, Lauki Chana Sabzi", "Rice", "Salad, Achar", "Chaach"],
    ["Chhole - Puri", "Masoori Daal, Rice", "Salad, Achar, Papad", "Chaach"],
  ],
  snacks: [
    ["Corn / Chana Chaat"],
    ["Maggi"],
    ["Mayo Corn Sandwich"],
    ["Fried Idli", "Hari and Laal Chutney"],
    ["Pav Bhaji"],
    ["Bhel / Pyaaz Bhajiya"],
    ["Pani-Puri"],
  ],
  dinner: [
    ["Masala Bhindi, Mix Daal", "Chapati, Rice", "Salad, Achar"],
    ["Dry Aaloo Jeera, Daal", "Poori, Rice", "Salad, Achar, Thecha", "Kheer / Fruit Custard"],
    ["Matar Paneer", "Chapati, Jeera Rice", "Daal Tadka", "Salad, Achar"],
    ["Baigan ka Bharta", "Chapati, Rice", "Salad, Achar", "Jalebi / Imarti / Gulab Jamun"],
    ["Aaloo Parwal / Dum Aloo", "Daal Makhni, Roti, Rice", "Salad, Achar", "Thecha"],
    ["Veg Biryani", "Aaloo Matar Sabzi, Chapati", "Salad, Achar", "Raita"],
    ["Kadhai Paneer, Daal Fry", "Chapati, Jeera Rice", "Salad, Achar", "Ice Cream"],
  ],
};

const mealTimings: Record<MealPeriod, [string, string]> = {
  breakfast: ["07:30", "09:30"],
  lunch: ["12:00", "14:00"],
  snacks: ["17:30", "18:30"],
  dinner: ["19:30", "21:30"],
};

export function buildDayMeals(dayIndex: number /* 0=Mon…6=Sun */): Meal[] {
  const periods: MealPeriod[] = ["breakfast", "lunch", "snacks", "dinner"];
  return periods.map((period) => {
    const dayItems = weeklyPlan[period][dayIndex] ?? [];
    const dishes: Dish[] = dayItems.map((name) => mkDish(name));
    // Sunday breakfast is 08:00 AM - 10:00 AM per mess notice
    const start = (period === "breakfast" && dayIndex === 6) ? "08:00" : mealTimings[period][0];
    const end = (period === "breakfast" && dayIndex === 6) ? "10:00" : mealTimings[period][1];
    return { period, start, end, dishes };
  });
}

export function buildWeekMenu(startDate: string): DailyMenu[] {
  const start = new Date(startDate + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = toISODate(d);
    const jsDay = d.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    return {
      date: dateStr,
      published: true,
      meals: buildDayMeals(dayIndex),
    };
  });
}

export function buildMenus(): DailyMenu[] {
  const out: DailyMenu[] = [];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let weekOffset = -2; weekOffset <= 3; weekOffset++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + weekOffset * 7);
    out.push(...buildWeekMenu(toISODate(d)));
  }
  return out;
}

export const notices: Notice[] = [
  { id: "n1", title: "Special dinner on Friday", body: "Festive dinner with paneer tikka and kheer this Friday, 7:30 PM onwards.", scope: "mess", createdAt: daysFromNow(-1), important: false },
  { id: "n2", title: "Sunday breakfast timing change", body: "Breakfast on Sunday will be served 8:00 – 10:00 AM.", scope: "mess", createdAt: daysFromNow(-2), important: true },
  { id: "n3", title: "Mid-semester exam schedule released", body: "Check the academic portal for your mid-sem timetable. (Sample notice)", scope: "campus", createdAt: daysFromNow(-1), important: true },
  { id: "n4", title: "Library extended hours", body: "Library open till midnight during exam week. (Sample notice)", scope: "campus", createdAt: daysFromNow(-3) },
];

export const clubs: Club[] = [
  {
    id: "c1", name: "Eklavya", tagline: "Sports & Athletics Club", category: "sports",
    description: "Eklavya is the official sports club of IIIT Nagpur, organising cricket, football, basketball, badminton, table tennis, athletics and inter-college sports tournaments.",
    coordinator: "TBD", leads: ["Abhay Jha", "Ajmal"], members: 120, recruiting: true, color: "2",
    clubMembers: [
      { name: "Abhay Jha", role: "lead", contact: "7668595040" },
      { name: "Ajmal", role: "co-lead", contact: "7842730412" },
    ],
  },
  {
    id: "c2", name: "Dimensions", tagline: "Game development club", category: "technical",
    description: "Dimensions is the game development club of IIIT Nagpur, creating interactive games, virtual worlds, and game design experiences.",
    coordinator: "TBD", leads: ["Akshat Vyas", "Hetansh"], members: 50, recruiting: true, color: "4",
    clubMembers: [
      { name: "Akshat Vyas", role: "lead", contact: "7880145151" },
      { name: "Hetansh", role: "co-lead", contact: "9979955969" },
    ],
  },
  {
    id: "c3", name: "Strokes", tagline: "Fine arts & UI/UX", category: "cultural",
    description: "Strokes is IIIT Nagpur's fine arts and UI/UX design club, encouraging creativity through canvas, sketching, digital art, and user experience design.",
    coordinator: "TBD", leads: ["Dharmendra", "Piyush"], members: 45, recruiting: true, color: "5",
    clubMembers: [
      { name: "Dharmendra", role: "lead", contact: "7011963526" },
      { name: "Piyush", role: "co-lead", contact: "7023402867" },
    ],
  },
  {
    id: "c4", name: "Orator", tagline: "Public speaking & debate club", category: "cultural",
    description: "Orator trains students in public speaking, debating and oratory, competing at inter-college and national events.",
    coordinator: "TBD", leads: ["Rudraksh", "Samarth Hedau"], members: 55, recruiting: true, color: "1",
    clubMembers: [
      { name: "Rudraksh", role: "lead", contact: "7060109792" },
      { name: "Samarth Hedau", role: "co-lead", contact: "8962785787" },
    ],
  },
  {
    id: "c5", name: "Estoria", tagline: "Literary & storytelling club", category: "cultural",
    description: "Estoria is IIIT Nagpur's literary club, celebrating creative writing, poetry, storytelling and book discussions.",
    coordinator: "TBD", leads: ["Ansh Gupta", "Prasoon"], members: 48, recruiting: true, color: "3",
    clubMembers: [
      { name: "Ansh Gupta", role: "lead", contact: "8755253270" },
      { name: "Prasoon", role: "co-lead", contact: "9129859434" },
    ],
  },
  {
    id: "c6", name: "Crescendo", tagline: "Music & performing arts", category: "cultural",
    description: "Crescendo is the music club of IIIT Nagpur, bringing together musicians, vocalists and performers for jam sessions and fests.",
    coordinator: "TBD", leads: ["Sanchit", "Vikhyat"], members: 70, recruiting: true, color: "5",
    clubMembers: [
      { name: "Sanchit", role: "lead", contact: "9888524130" },
      { name: "Vikhyat", role: "co-lead", contact: "9599560925" },
    ],
  },
  {
    id: "c7", name: "CRISPR", tagline: "Central Research Initiative & Students Public Relations Platform", category: "technical",
    description: "Central research initiative and students public relations platform of IIIT Nagpur, fostering research innovation and campus outreach.",
    coordinator: "TBD", leads: ["Yash Khule", "Yash Gaikwad"], members: 40, recruiting: true, color: "3",
    clubMembers: [
      { name: "Yash Khule", role: "lead", contact: "9930501541" },
      { name: "Yash Gaikwad", role: "co-lead", contact: "9892198168" },
    ],
  },
  {
    id: "c8", name: "D-Taraxia", tagline: "Dance & movement arts", category: "cultural",
    description: "D-Taraxia is the dance club of IIIT Nagpur, embracing all dance forms from classical to contemporary and western styles.",
    coordinator: "TBD", leads: ["Eshika", "Sreekar"], members: 65, recruiting: true, color: "4",
    clubMembers: [
      { name: "Eshika", role: "lead", contact: "8010772499" },
      { name: "Sreekar", role: "co-lead", contact: "9391429049" },
    ],
  },
  {
    id: "c9", name: "Dot Slash", tagline: "Competitive coding & CP", category: "technical",
    description: "Dot Slash is the competitive programming club of IIIT Nagpur, focused on problem solving, coding contests and hackathons.",
    coordinator: "TBD", leads: ["Aditya Singh", "Agraj Shukla"], members: 110, recruiting: true, color: "1",
    clubMembers: [
      { name: "Aditya Singh", role: "lead", contact: "9264966840" },
      { name: "Agraj Shukla", role: "co-lead", contact: "6392886937" },
    ],
  },
  {
    id: "c10", name: "Iotics", tagline: "IoT & embedded systems", category: "technical",
    description: "Iotics is IIIT Nagpur's IoT and embedded systems club, building smart devices, automation projects and hardware prototypes.",
    coordinator: "TBD", leads: ["Niel Kotecha", "Shreyansh Jain"], members: 80, recruiting: true, color: "2",
    clubMembers: [
      { name: "Niel Kotecha", role: "lead", contact: "7976577767" },
      { name: "Shreyansh Jain", role: "co-lead", contact: "8302799631" },
    ],
  },
  {
    id: "c11", name: "Elevate", tagline: "Web development club", category: "technical",
    description: "Elevate is the web development club of IIIT Nagpur, dedicated to building modern web applications, full-stack technologies, and digital products.",
    coordinator: "TBD", leads: ["Satyam Samal", "Krushna Mali"], members: 95, recruiting: true, color: "1",
    clubMembers: [
      { name: "Satyam Samal", role: "lead", contact: "9692509119" },
      { name: "Krushna Mali", role: "co-lead", contact: "8530296969" },
    ],
  },
  {
    id: "c12", name: "Probe", tagline: "Photography & Cinematography Club", category: "cultural",
    description: "Probe is the photography and visual media club of IIIT Nagpur, capturing campus life, events, photowalks and visual storytelling.",
    coordinator: "TBD", leads: ["Sarthak", "Ritesh"], members: 55, recruiting: true, color: "3",
    clubMembers: [
      { name: "Sarthak", role: "lead", contact: "9302792396" },
      { name: "Ritesh", role: "co-lead", contact: "9175575734" },
    ],
  },
  {
    id: "c13", name: "Synergy", tagline: "Gaming & Esports Club", category: "sports",
    description: "Synergy is the gaming and esports community of IIIT Nagpur, hosting competitive tournaments in BGMI, Valorant, FIFA, and LAN gaming events.",
    coordinator: "TBD", leads: ["Samay Jain", "Purshottam"], members: 85, recruiting: true, color: "2",
    clubMembers: [
      { name: "Samay Jain", role: "lead", contact: "8788179852" },
      { name: "Purshottam", role: "co-lead", contact: "7780114237" },
    ],
  },
];

export const events: ClubEvent[] = [
  { id: "e-demodays", clubId: "c7", clubName: "CRISPR", title: "DemoDays(Final Day)", description: "CRISPR presents DemoDays(Final Day)! An exclusive showcase of cutting-edge tech innovations, student startup prototypes, biotech experiments, and project demonstrations.", date: "2026-10-30T11:00:00+05:30", venue: "Seminar Hall", deadline: "2026-10-29T23:59:00+05:30", capacity: 150, registered: 150 },
  { id: "e1", clubId: "c1", title: "CodeSprint 4.0", description: "A 3-hour ICPC-style contest with prizes for the top 10 teams. Teams of up to 3.", date: daysFromNow(3, 18), venue: "Lab Complex L-201", deadline: daysFromNow(2, 23, 59), capacity: 120, registered: 96 },
  { id: "e2", clubId: "c10", title: "Line Follower Workshop", description: "Build your first line-following robot with Iotics. Kits provided for registered participants.", date: daysFromNow(5, 15), venue: "ECE Workshop", deadline: daysFromNow(4, 20), capacity: 40, registered: 40 },
  { id: "e3", clubId: "c2", title: "Nukkad Natak Night", description: "Street play performances on social themes near the main lawn.", date: daysFromNow(7, 19), venue: "Main Lawn", deadline: daysFromNow(6, 20), capacity: 300, registered: 112 },
  { id: "e4", clubId: "c4", title: "Inter-Hostel Football Cup", description: "Register your hostel team for the knockout football tournament.", date: daysFromNow(10, 16), venue: "Sports Ground", deadline: daysFromNow(8, 18), capacity: 16, registered: 11 },
  { id: "e5", clubId: "c6", title: "Founders Fireside", description: "An evening with alumni founders on building startups from campus.", date: daysFromNow(12, 17), venue: "Auditorium", deadline: daysFromNow(11, 12), capacity: 200, registered: 58 },
  { id: "e6", clubId: "c5", title: "Open Mic Evening", description: "Sing, play, recite — everyone welcome.", date: daysFromNow(-6, 19), venue: "Amphitheatre", deadline: daysFromNow(-7), capacity: 150, registered: 132, attended: 118 },
  { id: "e7", clubId: "c1", title: "DSA Bootcamp: Graphs", description: "Graph algorithms crash course with practice problems.", date: daysFromNow(-12, 18), venue: "LH-3", deadline: daysFromNow(-13), capacity: 100, registered: 100, attended: 87 },
];

export const announcements: Announcement[] = [
  { id: "a-esummit", clubId: "c7", title: "E-Summit 2027 Coming This January! 🚀", body: "We are thrilled to announce that the flagship E-Summit is officially happening this January! Grand preparations have kicked off with exciting speaker sessions, startup pitches, hackathons, and networking opportunities. Stay tuned for dates and registration details!", createdAt: "2026-10-30T00:30:00.000Z" },
  { id: "a1", clubId: "c1", title: "Recruitment open for core team", body: "Apply by Sunday via the form shared on the club group.", createdAt: daysFromNow(-1) },
  { id: "a2", clubId: "c10", title: "Workshop kits arriving Thursday", body: "Registered participants collect kits from ECE workshop.", createdAt: daysFromNow(-2) },
  { id: "a3", clubId: "c4", title: "Badminton court booking", body: "Courts reserved for practice 6–8 PM on weekdays.", createdAt: daysFromNow(-3) },
];

export const registrations: Registration[] = [
  { eventId: "e1", userId: "u1", status: "registered", createdAt: daysFromNow(-1) },
  { eventId: "e6", userId: "u1", status: "registered", createdAt: daysFromNow(-10) },
];

export const itemRequests: ItemRequest[] = [];

export const listings: Listing[] = [];

export const purchaseRequests: PurchaseRequest[] = [];

export const reports: Report[] = [];

export const ratings: DishRating[] = [
  { id: "dr1", userId: "u1", dishId: "paneer-butter-masala", dishName: "Paneer Butter Masala", date: toISODate(new Date(Date.now() - 864e5 * 2)), period: "lunch", stars: 5, comment: "Excellent gravy!", createdAt: daysFromNow(-2) },
  { id: "dr2", userId: "u1", dishId: "poha", dishName: "Poha", date: toISODate(new Date(Date.now() - 864e5 * 4)), period: "breakfast", stars: 3, createdAt: daysFromNow(-4) },
];

export const notifications: AppNotification[] = [
  { id: "nt1", title: "CodeSprint 4.0 registration confirmed", createdAt: daysFromNow(-1), read: false },
  { id: "nt2", title: "New purchase request on Electric kettle", createdAt: daysFromNow(-1), read: false },
  { id: "nt3", title: "Mess menu for next week published", createdAt: daysFromNow(-2), read: true },
];
