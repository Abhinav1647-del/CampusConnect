import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messService } from "@/services/messService";
import { clubService } from "@/services/clubService";
import { campusCartService } from "@/services/campusCartService";
import { userService } from "@/services/userService";
import { useRole } from "@/context/RoleContext";

// Query keys include the demo user id so switching roles refetches cleanly.
const useUid = () => useRole().previewUserId;

export const useMenu = (date: string) => { const u = useUid(); return useQuery({ queryKey: ["menu", date, u], queryFn: () => messService.getMenu(date) }); };
export const useWeekMenu = (start: string) => { const u = useUid(); return useQuery({ queryKey: ["week", start, u], queryFn: () => messService.getWeek(start) }); };
export const useCrowd = () => useQuery({ queryKey: ["crowd"], queryFn: messService.getCrowd, refetchInterval: 60_000 });
export const useRatingHistory = () => { const u = useUid(); return useQuery({ queryKey: ["history", u], queryFn: messService.getHistory }); };
export const useNotices = () => useQuery({ queryKey: ["notices"], queryFn: messService.getNotices });
export const useClubs = () => useQuery({ queryKey: ["clubs"], queryFn: clubService.list });
export const useClub = (id: string) => useQuery({ queryKey: ["club", id], queryFn: () => clubService.get(id) });
export const useEvents = () => useQuery({ queryKey: ["events"], queryFn: clubService.allEvents });
export const useAnnouncements = () => useQuery({ queryKey: ["announcements"], queryFn: clubService.allAnnouncements });
export const useMyRegistrations = () => { const u = useUid(); return useQuery({ queryKey: ["registrations", u], queryFn: clubService.myRegistrations }); };
export const useEventRegistrations = (id: string) => useQuery({ queryKey: ["eventRegs", id], queryFn: () => clubService.eventRegistrations(id) });
export const useListings = () => useQuery({ queryKey: ["listings"], queryFn: campusCartService.list });
export const useItemRequests = () => useQuery({ queryKey: ["itemRequests"], queryFn: campusCartService.listItemRequests });
export const useListing = (id: string) => useQuery({ queryKey: ["listing", id], queryFn: () => campusCartService.get(id) });
export const useMyRequests = () => { const u = useUid(); return useQuery({ queryKey: ["requests", u], queryFn: campusCartService.myRequests }); };
export const useReports = () => { const u = useUid(); return useQuery({ queryKey: ["reports", u], queryFn: campusCartService.reports }); };
export const useNotifications = () => { const u = useUid(); return useQuery({ queryKey: ["notifications", u], queryFn: userService.notifications }); };

/** Mutation with toast feedback + broad invalidation of related keys. */
export function useAction<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, opts: { success: string; invalidate: string[]; onSuccess?: (r: TRes) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      toast.success(opts.success);
      opts.invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      opts.onSuccess?.(r);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });
}
