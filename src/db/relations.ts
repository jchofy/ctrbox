import { relations } from "drizzle-orm";
import { campaigns, keywords, visits, proxies } from "./schema";

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  keywords: many(keywords),
  visits: many(visits),
}));

export const keywordsRelations = relations(keywords, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [keywords.campaignId],
    references: [campaigns.id],
  }),
  visits: many(visits),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  keyword: one(keywords, {
    fields: [visits.keywordId],
    references: [keywords.id],
  }),
  campaign: one(campaigns, {
    fields: [visits.campaignId],
    references: [campaigns.id],
  }),
  proxy: one(proxies, {
    fields: [visits.proxyId],
    references: [proxies.id],
  }),
}));

export const proxiesRelations = relations(proxies, ({ many }) => ({
  visits: many(visits),
}));
