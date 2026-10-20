// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const songs=sqliteTable('songs',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1),updated:text('updated').notNull()});
export const history=sqliteTable('song_history',{id:integer('id').primaryKey({autoIncrement:true}),songId:text('song_id').notNull(),data:text('data').notNull(),savedAt:text('saved_at').notNull()});
export const sessions=sqliteTable('editor_sessions',{tokenHash:text('token_hash').primaryKey(),username:text('username').notNull(),expires:integer('expires').notNull()});
export const attempts=sqliteTable('login_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
export const passwords=sqliteTable('editor_passwords',{username:text('username').primaryKey(),passwordHash:text('password_hash').notNull(),updated:integer('updated').notNull()});
