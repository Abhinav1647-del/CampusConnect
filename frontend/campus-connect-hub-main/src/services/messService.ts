import { api } from "./api";
import { endpoints } from "./endpoints";
import type { DailyMenu, DishRating, DishRatingInput, MealPeriod, Notice, RatingHistory } from "@/types";
import { buildWeekMenu, getDishStats } from "@/mocks/data";

const periodTimings: Record<string, [string, string]> = {
  BREAKFAST: ["07:30", "09:30"],
  LUNCH: ["12:00", "14:00"],
  SNACKS: ["17:30", "18:30"],
  DINNER: ["19:30", "21:30"],
};

const CUSTOM_MENUS_KEY = "cc_custom_daily_menus";
const RATINGS_STORE_KEY = "cc_user_dish_ratings";

function getCustomMenus(): Record<string, DailyMenu> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_MENUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomMenu(menu: DailyMenu) {
  if (typeof window === "undefined") return;
  try {
    const all = getCustomMenus();
    all[menu.date] = menu;
    localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function getLocalRatings(): DishRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RATINGS_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordLocalRating(input: DishRatingInput): DishRating {
  const fallbackRecord: DishRating = {
    ...input,
    id: `dr-${Date.now()}`,
    userId: "u1",
    dishName: input.dishId,
    createdAt: new Date().toISOString(),
  };
  if (typeof window === "undefined") {
    return fallbackRecord;
  }
  try {
    const list = getLocalRatings();
    const existingIndex = list.findIndex(
      (r) => r.dishId === input.dishId && r.date === input.date && r.period === input.period
    );
    const newRecord: DishRating = {
      ...input,
      id: existingIndex >= 0 ? list[existingIndex]!.id : `dr-${Date.now()}`,
      userId: existingIndex >= 0 ? list[existingIndex]!.userId : "u1",
      dishName: existingIndex >= 0 ? list[existingIndex]!.dishName : input.dishId,
      createdAt: existingIndex >= 0 ? list[existingIndex]!.createdAt : new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      list[existingIndex] = newRecord;
    } else {
      list.unshift(newRecord);
    }
    localStorage.setItem(RATINGS_STORE_KEY, JSON.stringify(list));
    return newRecord;
  } catch {
    return fallbackRecord;
  }
}

function applyUserRatingsToMenu(menu: DailyMenu): DailyMenu {
  const localRatings = getLocalRatings();
  const dayRatings = localRatings.filter((r) => r.date === menu.date);

  return {
    ...menu,
    meals: menu.meals.map((meal) => ({
      ...meal,
      dishes: meal.dishes.map((dish) => {
        const stats = getDishStats(dish.name);
        let avgRating = dish.avgRating > 0 ? dish.avgRating : stats.avgRating;
        let ratingCount = dish.ratingCount > 0 ? dish.ratingCount : stats.ratingCount;

        const userRating = dayRatings.find(
          (r) => r.dishId === dish.id && r.period.toLowerCase() === meal.period.toLowerCase()
        );

        if (userRating) {
          avgRating = +((avgRating * ratingCount + userRating.stars) / (ratingCount + 1)).toFixed(1);
          ratingCount += 1;
        }

        return {
          ...dish,
          avgRating,
          ratingCount,
        };
      }),
    })),
  };
}

function transformMealsToDailyMenu(date: string, meals: any[]): DailyMenu {
  const periods = ["breakfast", "lunch", "snacks", "dinner"] as const;
  const formattedMeals = periods.map((p) => {
    const found = (meals || []).find(
      (m: any) => (m.period || "").toUpperCase() === p.toUpperCase()
    );
    const timingKey = p.toUpperCase();
    const dishes = (found?.mealItems || []).map((mi: any) => {
      const name = mi.menuItem?.name || mi.name || "Dish";
      const stats = getDishStats(name);
      return {
        id: mi.menuItemId || mi.id || mi.menuItem?.id || `dish-${p}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        veg: mi.menuItem?.isVegetarian ?? mi.isVeg ?? mi.veg ?? true,
        avgRating: mi.menuItem?.averageRating ?? stats.avgRating,
        ratingCount: mi.menuItem?.totalRatings ?? stats.ratingCount,
      };
    });
    return {
      period: p,
      start: periodTimings[timingKey]?.[0] || "08:00",
      end: periodTimings[timingKey]?.[1] || "10:00",
      dishes: dishes.length > 0 ? dishes : (found?.dishes || []),
    };
  });

  return {
    date,
    published: (meals || []).length > 0 ? (meals[0]?.isPublished ?? true) : true,
    meals: formattedMeals,
  };
}

export const messService = {
  getMenu: async (date: string): Promise<DailyMenu | null> => {
    const custom = getCustomMenus()[date];
    if (custom) return applyUserRatingsToMenu(custom);

    try {
      const res = await api.get<any>(endpoints.mess.menu(date));
      if (!res) return applyUserRatingsToMenu(buildWeekMenu(date)[0] ?? null!);
      if (res && typeof res === "object" && "meals" in res && Array.isArray(res.meals) && res.meals.length > 0) {
        return applyUserRatingsToMenu(res as DailyMenu);
      }
      if (Array.isArray(res) && res.length > 0) {
        return applyUserRatingsToMenu(transformMealsToDailyMenu(date, res));
      }
      return applyUserRatingsToMenu(buildWeekMenu(date)[0] ?? null!);
    } catch {
      return applyUserRatingsToMenu(buildWeekMenu(date)[0] ?? null!);
    }
  },

  getWeek: async (start: string): Promise<DailyMenu[]> => {
    const customs = getCustomMenus();
    try {
      const res = await api.get<any>(endpoints.mess.week(start));
      let week: DailyMenu[] = [];
      if (Array.isArray(res) && res.length > 0 && "meals" in res[0] && res[0].meals.length > 0) {
        week = res as DailyMenu[];
      } else {
        week = buildWeekMenu(start);
      }
      return week.map((d) => applyUserRatingsToMenu(customs[d.date] || d));
    } catch {
      const base = buildWeekMenu(start);
      return base.map((d) => applyUserRatingsToMenu(customs[d.date] || d));
    }
  },

  getCrowd: async () => {
    try {
      const res = await api.get<{ level: "low" | "medium" | "high"; updatedAt: string }>(endpoints.mess.crowd);
      return res || { level: "low", updatedAt: new Date().toISOString() };
    } catch {
      return { level: "low", updatedAt: new Date().toISOString() };
    }
  },

  getHistory: async (): Promise<RatingHistory> => {
    const localRatings = getLocalRatings();
    try {
      const res = await api.get<any>(endpoints.mess.ratingsHistory);
      if (res && typeof res === "object" && "monthly" in res) {
        return {
          ...res,
          mine: localRatings.length > 0 ? localRatings : res.mine,
        };
      }
    } catch {
      /* ignore */
    }
    return {
      monthly: [
        { month: "Jun", avg: 4.1, count: 680 },
        { month: "Jul", avg: 4.3, count: 740 },
        { month: "Aug", avg: 4.2, count: 810 },
        { month: "Sep", avg: 4.4, count: 890 },
        { month: "Oct", avg: 4.5, count: 960 },
      ],
      top: [
        { name: "Chole - Puri", avg: 4.8, count: 210 },
        { name: "Masala Dosa", avg: 4.7, count: 194 },
        { name: "Matar Paneer", avg: 4.6, count: 182 },
        { name: "Pav Bhaji", avg: 4.6, count: 175 },
      ],
      bottom: [
        { name: "Lauki Chana Sabzi", avg: 3.6, count: 95 },
        { name: "Soya Wadi", avg: 3.7, count: 104 },
      ],
      mine: localRatings,
    };
  },

  rate: async (input: DishRatingInput): Promise<DishRating> => {
    // 1. Record rating locally so it immediately updates and persists
    const local = recordLocalRating(input);

    // 2. Try to sync with backend
    try {
      await api.post<any>(endpoints.mess.rate, {
        dishId: input.dishId,
        date: input.date,
        period: input.period,
        stars: input.stars,
        rating: input.stars,
        comment: input.comment,
        feedback: input.comment,
      });
    } catch (err) {
      console.warn("Rating synced to local store:", err);
    }

    return local;
  },

  saveMenu: async (menu: DailyMenu) => {
    saveCustomMenu(menu);
    try {
      return await api.post<DailyMenu>(endpoints.mess.adminMenu, menu);
    } catch {
      return menu;
    }
  },

  updateMealDishes: async (date: string, period: MealPeriod, dishNames: string[], published = true): Promise<DailyMenu> => {
    let current = await messService.getMenu(date);
    if (!current) {
      current = {
        date,
        published,
        meals: [
          { period: "breakfast", start: "07:30", end: "09:30", dishes: [] },
          { period: "lunch", start: "12:00", end: "14:00", dishes: [] },
          { period: "snacks", start: "17:30", end: "18:30", dishes: [] },
          { period: "dinner", start: "19:30", end: "21:30", dishes: [] },
        ],
      };
    }

    const updatedMeals = current.meals.map((m) => {
      if (m.period.toLowerCase() !== period.toLowerCase()) return m;
      const newDishes = dishNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, i) => {
          const stats = getDishStats(name);
          return {
            id: `dish-${period}-${Date.now()}-${i}`,
            name,
            veg: !name.toLowerCase().includes("chicken") && !name.toLowerCase().includes("egg") && !name.toLowerCase().includes("fish"),
            avgRating: stats.avgRating,
            ratingCount: stats.ratingCount,
          };
        });
      return { ...m, dishes: newDishes };
    });

    const updatedMenu: DailyMenu = {
      ...current,
      published,
      meals: updatedMeals,
    };

    return await messService.saveMenu(updatedMenu);
  },

  getNotices: async () => {
    try {
      const res = await api.get<any[]>(endpoints.notices);
      const list = Array.isArray(res) ? res : [];
      return list.map((n) => ({
        id: n.id,
        title: n.title || "",
        body: n.body || n.content || "",
        scope: (n.scope || (n.messId ? "mess" : "campus")) as any,
        createdAt: n.createdAt || n.publishedAt || new Date().toISOString(),
        important: n.important ?? false,
      }));
    } catch {
      return [];
    }
  },

  createNotice: (n: { title: string; body: string; important?: boolean }) =>
    api.post<Notice>(endpoints.mess.adminNotices, n),

  deleteNotice: (id: string) => api.delete<void>(`${endpoints.mess.adminNotices}/${id}`),
};
