import { sqliteTable, text, integer, real, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  shareCode: text("share_code").unique(),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: text("joined_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.userId] })]
);

export const persons = sqliteTable(
  "persons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
    createdByUserId: text("created_by_user_id"),
  },
  (table) => [uniqueIndex("persons_name_unique").on(table.name)]
);

export const personGroups = sqliteTable(
  "person_groups",
  {
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.personId, table.groupId] })]
);

export const dips = sqliteTable("dips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  locationName: text("location_name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  waterTemp: real("water_temp"),
  airTemp: real("air_temp"),
  weatherDescription: text("weather_description"),
  weatherIcon: text("weather_icon"),
  windSpeed: real("wind_speed"),
  dippedAt: text("dipped_at").notNull(),
  notes: text("notes"),
  images: text("images"),
  createdByUserId: text("created_by_user_id"),
  createdAt: text("created_at").notNull(),
});

export const dipParticipants = sqliteTable(
  "dip_participants",
  {
    dipId: integer("dip_id")
      .notNull()
      .references(() => dips.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.dipId, table.personId] })]
);

export const savedLocations = sqliteTable("saved_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
});
