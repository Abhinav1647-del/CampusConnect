import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";
import { endpoints } from "@/services/endpoints";
import type { User } from "@/types";
import { useRole } from "@/context/RoleContext";

export const COLLEGE_DOMAIN = "iiitn.ac.in";

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .email("Enter a valid email address.")
    .refine(
      (e) => e.endsWith(`@${COLLEGE_DOMAIN}`),
      `Only college email IDs ending in @${COLLEGE_DOMAIN} are accepted.`
    ),
  password: z.string().min(6, "Password must be at least 6 characters.").max(128),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Campus Connect IIIT Nagpur" },
      { name: "description", content: "Sign in to Campus Connect with your IIIT Nagpur college email ID." },
      { property: "og:title", content: "Sign in — Campus Connect IIIT Nagpur" },
      { property: "og:description", content: "Sign in with your IIIT Nagpur college email ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        ...(f.email?.[0] ? { email: f.email[0] } : {}),
        ...(f.password?.[0] ? { password: f.password[0] } : {}),
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await api.post<{
        token?: string;
        accessToken?: string;
        user?: User;
      }>(endpoints.auth.login, parsed.data);

      const token = res?.token || res?.accessToken || "demo-token";
      signIn(token);
      toast.success(
        `Welcome back, ${(res?.user?.name || "Student").split(" ")[0]}!`
      );
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
  }

  return (
    <div className="mx-auto flex max-w-md flex-col py-8 px-4">
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-6 w-6" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use your IIIT Nagpur college account to continue.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-lg border bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Only <span className="font-semibold text-foreground">college email IDs</span> are accepted — e.g.{" "}
          <span className="font-mono text-primary font-medium">bt21cse001@{COLLEGE_DOMAIN}</span>.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">College email ID</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`bt21cse001@${COLLEGE_DOMAIN}`}
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
            />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
        </Button>
      </form>

      {/* Quick Demo Credentials */}
      <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Demo Accounts (1-Click Fill)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2"
            onClick={() => fillDemoAccount("bt21cse001@iiitn.ac.in", "Student@123456")}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Student</div>
              <div className="text-[10px] text-muted-foreground">Arjun Sharma</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2"
            onClick={() => fillDemoAccount("mess.admin@iiitn.ac.in", "Admin@123456")}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Mess Admin</div>
              <div className="text-[10px] text-muted-foreground">Mess Administrator</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2"
            onClick={() => fillDemoAccount("bt21cse003@iiitn.ac.in", "Student@123456")}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Club Lead</div>
              <div className="text-[10px] text-muted-foreground">Rohan Mehta</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2"
            onClick={() => fillDemoAccount("moderator@iiitn.ac.in", "Admin@123456")}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Cart Moderator</div>
              <div className="text-[10px] text-muted-foreground">Marketplace Moderator</div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2"
            onClick={() => fillDemoAccount("admin@iiitn.ac.in", "Admin@123456")}
          >
            <div className="text-left">
              <div className="font-medium text-foreground">Campus Admin</div>
              <div className="text-[10px] text-muted-foreground">Admin Console</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
