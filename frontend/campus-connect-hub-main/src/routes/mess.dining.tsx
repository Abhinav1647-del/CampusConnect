import { createFileRoute } from "@tanstack/react-router";
import { Clock, Info, MapPin } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, messTabs } from "@/components/shared/SubNav";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/mess/dining")({
  head: () => seo("Dining info", "Mess timings and dining hall guidelines at IIIT Nagpur."),
  component: Dining,
});

const timings = [
  ["Breakfast", "07:30 AM – 09:30 AM (Sun: 08:00 AM – 10:00 AM)"],
  ["Lunch", "12:00 PM – 02:00 PM"],
  ["Snacks", "05:30 PM – 06:30 PM"],
  ["Dinner", "07:30 PM – 09:30 PM"],
];
const rules = [
  "Carry your student ID card — it may be checked at the entrance.",
  "Return plates and cutlery to the wash counter.",
  "Take only what you'll finish. Food waste is tracked weekly.",
  "Special diet requests go to the mess office before 10 AM.",
];

function Dining() {
  return (
    <div>
      <PageHeader eyebrow="Mess & Dining" title="Dining info" />
      <SubNav items={messTabs} />
      <div className="max-w-2xl">
        <section className="border-y py-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Clock className="h-5 w-5 text-primary" />Timings</h2>
          <dl className="divide-y">{timings.map(([k, v]) => <div key={k} className="flex justify-between py-2 text-sm"><dt>{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
        </section>
      </div>
      <section className="mt-8">
        <SectionTitle>Good to know</SectionTitle>
        <ul className="space-y-2">{rules.map((r) => <li key={r} className="flex gap-3 rounded-xl border bg-card p-3 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}</ul>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />Central Dining Hall, ground floor · Mess office open 9 AM – 5 PM</p>
      </section>
    </div>
  );
}
