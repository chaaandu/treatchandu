export type SweetId = "kaju" | "jamun" | "laddoo" | "jalebi" | "rasgulla" | "choco" | "chai";

export type Status = "issued" | "tasting" | "stove" | "served" | "bitter";
export type Need = "today" | "tomorrow" | "week" | "whenever";
export type Lane = "now" | "next" | "later" | "done";

export interface Offer {
  id: string;
  request_id: string;
  name: string;
  sweet: SweetId;
  qty: number;
  state: "promised" | "delivered";
  created_at: string;
  delivered_at?: string | null;
}

export interface Req {
  id: string;
  token_no: number;
  slug: string;
  name: string;
  title: string;
  detail: string;
  link: string;
  need: Need;
  private: boolean;
  status: Status;
  pinned: boolean;
  served_url: string;
  note: string;
  ip_hash: string;
  created_at: string;
  updated_at: string;
}

export interface BoardItem {
  id: string;
  no: number;
  title: string;
  lane: Lane;
  sort: number;
}

export interface Work {
  id: string;
  title: string;
  url: string;
  when: string; // "Nov 2026"
  blurb: string;
  metric: string;
  hue: number;
  sort: number;
}

/** What the public page gets. Private titles are already removed. */
export interface PublicToken {
  token_no: number;
  name: string;
  title: string | null; // null when private
  need: Need;
  status: Status;
  pinned: boolean;
  served_url: string;
  note: string;
  created_at: string;
  updated_at: string;
  score: number;
  sweets: { sweet: SweetId; qty: number; state: "promised" | "delivered" }[];
}

export type CalKind = "meeting" | "focus" | "out";
export interface CalEvent {
  start: string;
  end: string;
  kind: CalKind;
  title: string | null;
}

export type Mood = "free" | "call" | "focus" | "out" | "asleep";

export interface DeskState {
  now: string;
  mood: Mood;
  moodUntil: string | null;
  sugar: number; // 0..1
  calendar: { events: CalEvent[]; sample: boolean };
  board: BoardItem[];
  work: Work[];
  queue: PublicToken[];
  ledger: { name: string; points: number; delivered: number; promised: number; kcal: number }[];
  jar: { name: string; sweet: SweetId; state: "promised" | "delivered"; at: string }[];
  kcal: number;
  live: { supabaseUrl: string; supabaseKey: string } | null;
}
