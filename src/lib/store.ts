import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { BOARD_SEED, WORK_SEED } from "./seed";
import type { BoardItem, Offer, Req, Work } from "./types";

export interface Store {
  requests(): Promise<Req[]>;
  offers(): Promise<Offer[]>;
  board(): Promise<BoardItem[]>;
  work(): Promise<Work[]>;
  createRequest(r: Omit<Req, "token_no">): Promise<Req>;
  updateRequest(id: string, patch: Partial<Req>): Promise<void>;
  deleteRequest(id: string): Promise<void>;
  addOffers(o: Offer[]): Promise<void>;
  updateOffer(id: string, patch: Partial<Offer>): Promise<void>;
  updateBoard(id: string, patch: Partial<BoardItem>): Promise<void>;
  saveWork(w: Work): Promise<void>;
  deleteWork(id: string): Promise<void>;
}

/* ---------------- Supabase (production) ---------------- */

class SupabaseStore implements Store {
  db: SupabaseClient;
  constructor(url: string, key: string) {
    this.db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  private async all<T>(table: string, order: string, seed?: T[]): Promise<T[]> {
    const { data, error } = await this.db.from(table).select("*").order(order);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (seed && data.length === 0) {
      await this.db.from(table).insert(seed as never);
      return seed;
    }
    return data as T[];
  }
  requests() { return this.all<Req>("requests", "created_at"); }
  offers() { return this.all<Offer>("offers", "created_at"); }
  board() { return this.all<BoardItem>("board", "sort", BOARD_SEED); }
  work() { return this.all<Work>("work", "sort", WORK_SEED); }
  async createRequest(r: Omit<Req, "token_no">) {
    const { data, error } = await this.db.from("requests").insert(r).select("*").single();
    if (error) throw new Error(error.message);
    return data as Req;
  }
  private async patch(table: string, id: string, patch: object) {
    const { error } = await this.db.from(table).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }
  updateRequest(id: string, p: Partial<Req>) { return this.patch("requests", id, { ...p, updated_at: new Date().toISOString() }); }
  async deleteRequest(id: string) {
    await this.db.from("offers").delete().eq("request_id", id);
    await this.db.from("requests").delete().eq("id", id);
  }
  async addOffers(o: Offer[]) {
    if (!o.length) return;
    const { error } = await this.db.from("offers").insert(o);
    if (error) throw new Error(error.message);
  }
  updateOffer(id: string, p: Partial<Offer>) { return this.patch("offers", id, p); }
  updateBoard(id: string, p: Partial<BoardItem>) { return this.patch("board", id, p); }
  async saveWork(w: Work) {
    const { error } = await this.db.from("work").upsert(w);
    if (error) throw new Error(error.message);
  }
  async deleteWork(id: string) { await this.db.from("work").delete().eq("id", id); }
}

/* ---------------- Local file (dev), memory on read-only hosts ---------------- */

interface DB { requests: Req[]; offers: Offer[]; board: BoardItem[]; work: Work[] }
const FILE = path.join(process.cwd(), ".data", "db.json");

class FileStore implements Store {
  private db: DB | null = null;
  private persist = !process.env.VERCEL;
  private async load(): Promise<DB> {
    if (this.db) return this.db;
    try {
      this.db = JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
    } catch {
      this.db = { requests: [], offers: [], board: BOARD_SEED, work: WORK_SEED };
    }
    return this.db;
  }
  private async save() {
    if (!this.persist || !this.db) return;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(this.db, null, 2));
  }
  async requests() { return [...(await this.load()).requests]; }
  async offers() { return [...(await this.load()).offers]; }
  async board() { return [...(await this.load()).board].sort((a, b) => a.sort - b.sort); }
  async work() { return [...(await this.load()).work].sort((a, b) => a.sort - b.sort); }
  async createRequest(r: Omit<Req, "token_no">) {
    const db = await this.load();
    const token_no = db.requests.reduce((m, x) => Math.max(m, x.token_no), 0) + 1;
    const full = { ...r, token_no } as Req;
    db.requests.push(full);
    await this.save();
    return full;
  }
  async updateRequest(id: string, p: Partial<Req>) {
    const db = await this.load();
    db.requests = db.requests.map((r) => (r.id === id ? { ...r, ...p, updated_at: new Date().toISOString() } : r));
    await this.save();
  }
  async deleteRequest(id: string) {
    const db = await this.load();
    db.requests = db.requests.filter((r) => r.id !== id);
    db.offers = db.offers.filter((o) => o.request_id !== id);
    await this.save();
  }
  async addOffers(o: Offer[]) {
    (await this.load()).offers.push(...o);
    await this.save();
  }
  async updateOffer(id: string, p: Partial<Offer>) {
    const db = await this.load();
    db.offers = db.offers.map((o) => (o.id === id ? { ...o, ...p } : o));
    await this.save();
  }
  async updateBoard(id: string, p: Partial<BoardItem>) {
    const db = await this.load();
    db.board = db.board.map((b) => (b.id === id ? { ...b, ...p } : b));
    await this.save();
  }
  async saveWork(w: Work) {
    const db = await this.load();
    db.work = db.work.some((x) => x.id === w.id) ? db.work.map((x) => (x.id === w.id ? w : x)) : [...db.work, w];
    await this.save();
  }
  async deleteWork(id: string) {
    const db = await this.load();
    db.work = db.work.filter((w) => w.id !== id);
    await this.save();
  }
}

const g = globalThis as unknown as { __deskStore?: Store };

export function store(): Store {
  if (!g.__deskStore) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    g.__deskStore = url && key ? new SupabaseStore(url, key) : new FileStore();
  }
  return g.__deskStore;
}
