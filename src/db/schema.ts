import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow();

// The four tables below follow the shape Better Auth requires; property names
// must match its field names because the Drizzle adapter maps by key.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt,
  updatedAt,
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt,
  updatedAt,
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt,
  updatedAt,
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
});

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt,
  },
  (table) => [unique("characters_user_name_unique").on(table.userId, table.name)],
);

const mesos = (column: string) => bigint(column, { mode: "number" }).notNull();
// EXP needed at level 99 exceeds the 32-bit integer range.
const exp = (column: string) => bigint(column, { mode: "number" }).notNull();
const milliseconds = (column: string) =>
  bigint(column, { mode: "number" }).notNull();

export const grindSessions = pgTable(
  "grind_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "restrict" }),
    monster: text("monster").notNull().default(""),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    activeMs: milliseconds("active_ms"),
    mesosStart: mesos("mesos_start"),
    mesosEnd: mesos("mesos_end"),
    levelStart: integer("level_start").notNull(),
    expStart: exp("exp_start"),
    levelEnd: integer("level_end").notNull(),
    expEnd: exp("exp_end"),
    notes: text("notes").notNull().default(""),
    createdAt,
  },
  (table) => [
    index("grind_sessions_user_started_idx").on(table.userId, table.startedAt),
  ],
);

export const activeGrinds = pgTable("active_grinds", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  characterId: uuid("character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  monster: text("monster").notNull().default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  pausedMs: milliseconds("paused_ms").default(0),
  pauseStartedAt: timestamp("pause_started_at", { withTimezone: true }),
  mesosStart: mesos("mesos_start"),
  levelStart: integer("level_start").notNull(),
  expStart: exp("exp_start"),
});
