import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const deliveries = sqliteTable('deliveries', {
 id: integer('id').primaryKey(), status: text('status').notNull(),
 messageId: text('message_id'), updated: text('updated').notNull(),
});
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
