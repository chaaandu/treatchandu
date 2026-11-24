import type { BoardItem, Work } from "./types";

// Chandu's 11 to-dos (24 Nov 2026). Public titles: short, no names.
export const BOARD_SEED: BoardItem[] = [
  { no: 7, title: "Bribe Desk (this page)", lane: "now" },
  { no: 1, title: "Mentor check-ins: shared notes, agendas, call summaries", lane: "next" },
  { no: 2, title: "Mentor allocation: students book only their mentors", lane: "next" },
  { no: 3, title: "One page per student, FRS first", lane: "next" },
  { no: 10, title: "All acads submissions: async + workbooks", lane: "next" },
  { no: 4, title: "Clean up the student view", lane: "later" },
  { no: 5, title: "Clean up the team view", lane: "later" },
  { no: 6, title: "Admin view and access", lane: "later" },
  { no: 8, title: "Mentor onboarding portal", lane: "later" },
  { no: 9, title: "Acads submissions leaderboard", lane: "later" },
  { no: 11, title: "Forge Connect: clean up the video call", lane: "later" },
].map((b, i) => ({ ...b, id: `b${b.no}`, sort: i }) as BoardItem);

// DRAFT: Chandu will send the real list. Only public-safe facts here.
export const WORK_SEED: Work[] = [
  { title: "Forge", url: "https://forge.mesaschool.co.in", when: "2026", blurb: "The home for the Forge cohort: apps, house points, people.", metric: "1 launcher", hue: 22 },
  { title: "Forge Connect", url: "https://forge.mesaschool.co.in/connect", when: "Nov 2026", blurb: "Students book 30-minute mentor calls. Own video room.", metric: "Own WebRTC room", hue: 265 },
  { title: "Venture Demo Day", url: "https://forge.mesaschool.co.in", when: "19 Nov 2026", blurb: "Seven rooms, evaluators scoring live, results on the Dashboard.", metric: "67 pitches", hue: 340 },
  { title: "Demo Day Finals", url: "https://forge.mesaschool.co.in/finals", when: "28 Nov 2026", blurb: "Judging portal for the finals, built for one shared iPad.", metric: "1 iPad, every judge", hue: 45 },
  { title: "Acads, Term 2", url: "https://forge.mesaschool.co.in/acads", when: "Nov 2026", blurb: "Student workspace for Term 2: submissions, FRS, calendar.", metric: "Term 2", hue: 150 },
  { title: "Founder Speed Dating", url: "https://forge.mesaschool.co.in/speedate", when: "Nov 2026", blurb: "Profiles, rounds and co-founder matching.", metric: "Matches", hue: 0 },
  { title: "Student portal kit", url: "https://github.com/chaaandu/mesa-student-portal-template", when: "Nov 2026", blurb: "The Forge portal, packed for any Mesa batch.", metric: "1 kit, any batch", hue: 205 },
].map((w, i) => ({ ...w, id: `w${i + 1}`, sort: i }));
