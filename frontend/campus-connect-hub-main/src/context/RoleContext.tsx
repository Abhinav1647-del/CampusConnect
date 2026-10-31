import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setMockUser } from "@/mocks/adapter";
import { demoUsers } from "@/mocks/data";
import { isMockMode } from "@/services/api";
import { userService } from "@/services/userService";
import type { Role, User } from "@/types";

interface Ctx {
  user: User | undefined;
  /** DEMO ONLY: switches the mock user. Real permissions are enforced by the backend. */
  previewUserId: string;
  setPreviewUserId: (id: string) => void;
  can: (...roles: Role[]) => boolean;
  saved: { listings: string[]; events: string[] };
  toggleSaved: (kind: "listings" | "events", id: string) => void;
  signedIn: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}
const RoleCtx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [previewUserId, setId] = useState("u1");
  const [saved, setSaved] = useState<Ctx["saved"]>({ listings: [], events: [] });
  const [signedIn, setSignedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("cc_token");
  });

  const { data: user } = useQuery({
    queryKey: ["me", previewUserId, signedIn],
    enabled: signedIn,
    queryFn: async () => {
      if (!signedIn) return undefined;
      try {
        return await userService.me();
      } catch (err) {
        if (!signedIn) return undefined;
        setMockUser(previewUserId);
        return demoUsers.find((u) => u.id === previewUserId) || demoUsers[0];
      }
    },
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem("cc_saved");
      if (s) setSaved(JSON.parse(s));
      const r = localStorage.getItem("cc_demo_user");
      if (r && isMockMode) {
        setMockUser(r);
        setId(r);
      }
      const token = localStorage.getItem("cc_token");
      setSignedIn(!!token);
    } catch {
      /* ignore */
    }
  }, []);

  const roleAccounts: Record<string, { email: string; pass: string }> = {
    u1: { email: "bt21cse001@iiitn.ac.in", pass: "Student@123456" },
    u2: { email: "bt21cse003@iiitn.ac.in", pass: "Student@123456" },
    u3: { email: "mess.admin@iiitn.ac.in", pass: "Admin@123456" },
    u4: { email: "moderator@iiitn.ac.in", pass: "Admin@123456" },
    u5: { email: "admin@iiitn.ac.in", pass: "Admin@123456" },
  };

  const setPreviewUserId = async (id: string) => {
    setMockUser(id);
    setId(id);
    localStorage.setItem("cc_demo_user", id);
    const acc = roleAccounts[id];
    if (!isMockMode && acc) {
      try {
        const res = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: acc.email, password: acc.pass }),
        });
        const json = await res.json();
        const tok = json?.data?.accessToken || json?.data?.token;
        if (tok) {
          localStorage.setItem("cc_token", tok);
          setSignedIn(true);
        }
      } catch {
        /* ignore */
      }
    }
    qc.invalidateQueries();
  };

  const toggleSaved: Ctx["toggleSaved"] = (kind, id) =>
    setSaved((s) => {
      const next = {
        ...s,
        [kind]: s[kind].includes(id)
          ? s[kind].filter((x) => x !== id)
          : [...s[kind], id],
      };
      localStorage.setItem("cc_saved", JSON.stringify(next));
      return next;
    });

  const can = (...roles: Role[]) =>
    signedIn && !!user && (user.role === "admin" || roles.includes(user.role));

  const signIn = (token: string) => {
    localStorage.setItem("cc_token", token);
    setSignedIn(true);
    qc.invalidateQueries();
  };

  const signOut = () => {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_demo_user");
    setSignedIn(false);
    qc.removeQueries({ queryKey: ["me"] });
    qc.clear();
  };

  return (
    <RoleCtx.Provider
      value={{
        user: signedIn ? user : undefined,
        previewUserId,
        setPreviewUserId,
        can,
        saved,
        toggleSaved,
        signedIn,
        signIn,
        signOut,
      }}
    >
      {children}
    </RoleCtx.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
