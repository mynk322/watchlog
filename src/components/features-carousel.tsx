"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, Star, Users, CalendarRange } from "lucide-react";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Track everything you watch",
    body: "Log every movie and series in one place — a personal history that grows with you.",
  },
  {
    icon: Star,
    title: "Rate & review",
    body: "Give each title a rating and jot down what you thought while it's fresh.",
  },
  {
    icon: Users,
    title: "Follow friends",
    body: "See what the people you follow are watching and reviewing.",
  },
  {
    icon: CalendarRange,
    title: "Your year in film",
    body: "Watch hours, top genres, and stats that turn your log into a story.",
  },
] as const;

const INTERVAL_MS = 4000;

export function FeaturesCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % FEATURES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const feature = FEATURES[index];
  const Icon = feature.icon;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="relative min-h-[92px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{feature.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center gap-2">
        {FEATURES.map((f, i) => (
          <button
            key={f.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show feature: ${f.title}`}
            aria-current={i === index}
            className={
              i === index
                ? "h-1.5 w-6 rounded-full bg-accent transition-all"
                : "h-1.5 w-1.5 rounded-full bg-border transition-all hover:bg-muted cursor-pointer"
            }
          />
        ))}
      </div>
    </div>
  );
}
