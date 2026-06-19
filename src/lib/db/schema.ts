import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const persons = sqliteTable("persons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dips = sqliteTable("dips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  locationName: text("location_name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  waterTemp: real("water_temp"),
  airTemp: real("air_temp"),
  weatherDescription: text("weather_description"),
  weatherIcon: text("weather_icon"),
  dippedAt: text("dipped_at").notNull(),
  notes: text("notes"),
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
