import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { Personality } from "@/services/types";

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "PAUSED",
  "DELETION_PROCESS",
  "DELETED",
]);
export const questionDepthEnum = pgEnum("question_depth", [
  "ringan",
  "sedang",
  "dalam",
]);
export const questionBiasEnum = pgEnum("question_bias", [
  "introvert",
  "extrovert",
  "netral",
]);
export const roomStatusEnum = pgEnum("room_status", ["active", "completed"]);

const timestamps = {
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
};

export const plans = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  benefit_summary: jsonb("benefit_summary")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  price_after_discount: numeric("price_after_discount", { precision: 12, scale: 2 }),
  is_active: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const planBenefits = pgTable(
  "plan_benefit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plan_id: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    max_room: integer("max_room").notNull(),
    mode: varchar("mode", { length: 32 }).notNull(),
    question_per_session: integer("question_per_session").notNull(),
    personalized_deck: boolean("personalized_deck").notNull().default(false),
    offline_support: boolean("offline_support").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    planIdUnique: uniqueIndex("plan_benefit_plan_id_unique").on(table.plan_id),
  }),
);

export const roles = pgTable("role", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  description: text("description").notNull().default(""),
  ...timestamps,
});

export const questionCategories = pgTable("question_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  is_active: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const users = pgTable("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull(),
  avatar_url: text("avatar_url").notNull().default(""),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  ...timestamps,
});

export const providers = pgTable(
  "provider",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider_name: varchar("provider_name", { length: 64 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("provider_user_id_idx").on(table.user_id),
  }),
);

export const userRoles = pgTable(
  "user_role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role_id: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("user_role_user_id_idx").on(table.user_id),
    roleIdIdx: index("user_role_role_id_idx").on(table.role_id),
  }),
);

export const userPlans = pgTable(
  "user_plan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan_id: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    started_at: timestamp("started_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    ended_at: timestamp("ended_at", { withTimezone: true, mode: "string" }),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("user_plan_user_id_idx").on(table.user_id),
    planIdIdx: index("user_plan_plan_id_idx").on(table.plan_id),
  }),
);

export const userLogs = pgTable(
  "user_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: userStatusEnum("status").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("user_log_user_id_idx").on(table.user_id),
  }),
);

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  question_code: varchar("question_code", { length: 64 }).notNull().unique(),
  text_id: text("text_id").notNull(),
  text_en: text("text_en").notNull(),
  category_id: uuid("category_id")
    .notNull()
    .references(() => questionCategories.id, { onDelete: "restrict" }),
  depth: questionDepthEnum("depth").notNull(),
  bias: questionBiasEnum("bias").notNull(),
  for_group: boolean("for_group").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participant_count: integer("participant_count").notNull(),
    category_id: uuid("category_id")
      .notNull()
      .references(() => questionCategories.id, { onDelete: "restrict" }),
    personalities: jsonb("personalities").$type<
      [Personality, Personality] | null
    >(),
    deck: uuid("deck").array().notNull(),
    current_index: integer("current_index").notNull().default(0),
    favorites: uuid("favorites")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    status: roomStatusEnum("status").notNull().default("active"),
    window_start: integer("window_start"),
    exhausted_at: timestamp("exhausted_at", {
      withTimezone: true,
      mode: "string",
    }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    ended_at: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  },
  (table) => ({
    participantCountCheck: check(
      "rooms_participant_count_check",
      sql`${table.participant_count} >= 2`,
    ),
    userIdIdx: index("rooms_user_id_idx").on(table.user_id),
    categoryIdIdx: index("rooms_category_id_idx").on(table.category_id),
  }),
);

export const app_config = pgTable(
  "app_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maintenance_enabled: boolean("maintenance_enabled").notNull().default(false),
    maintenance_message_id: text("maintenance_message_id").notNull().default(""),
    maintenance_message_en: text("maintenance_message_en").notNull().default(""),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
);

export const announcements = pgTable(
  "announcements",
  {
    id: boolean("id").primaryKey().notNull().default(true),
    message_id: text("message_id").notNull().default(""),
    message_en: text("message_en").notNull().default(""),
    enabled: boolean("enabled").notNull().default(false),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    singleRowCheck: check(
      "announcements_single_row_check",
      sql`${table.id} = true`,
    ),
  }),
);

export type UserTableRow = typeof users.$inferSelect;
export type ProviderTableRow = typeof providers.$inferSelect;
export type PlanTableRow = typeof plans.$inferSelect;
export type PlanBenefitTableRow = typeof planBenefits.$inferSelect;
export type RoleTableRow = typeof roles.$inferSelect;
export type UserRoleTableRow = typeof userRoles.$inferSelect;
export type UserPlanTableRow = typeof userPlans.$inferSelect;
export type QuestionCategoryTableRow = typeof questionCategories.$inferSelect;
export type UserLogTableRow = typeof userLogs.$inferSelect;
export type RoomTableRow = typeof rooms.$inferSelect;
export type QuestionTableRow = typeof questions.$inferSelect;
export type AppConfigTableRow = typeof app_config.$inferSelect;
export type AnnouncementTableRow = typeof announcements.$inferSelect;
