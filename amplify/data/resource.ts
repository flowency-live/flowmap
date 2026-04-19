import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * FlowMap Data Schema
 *
 * Models:
 * - Theme: Portfolio groupings (e.g., "M&S Onboarding", "NatWest Onboarding")
 * - Team: Delivery teams (UPJ, UIE, UNC, Logan, DataE, DataS)
 * - Initiative: Work items with team-specific flow states
 *
 * Flow States: N/A | N/S | Discovery | Ready | Constrained | Doing | Done | Blocked
 *
 * Real-time: Subscriptions auto-generated for all mutations
 */
const schema = a.schema({
  /**
   * Theme - Portfolio grouping for initiatives (brand)
   */
  Theme: a
    .model({
      name: a.string().required(),
      faviconUrl: a.string(), // URL to brand favicon/logo
      initiatives: a.hasMany('Initiative', 'themeId'),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  /**
   * Team - Delivery team that works on initiatives
   */
  Team: a
    .model({
      name: a.string().required(),
      isPrimaryConstraint: a.boolean().default(false),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  /**
   * Initiative - Work item tracked across teams
   *
   * teamStates is stored as JSON string: {"team-id-1": "Ready", "team-id-2": "Doing"}
   * This allows flexible per-team state tracking without a separate join table.
   *
   * Dates:
   * - liveDate: Go-live date for parent initiatives (e.g., "LIVE 29th June")
   * - dueDate: UAT delivery date for child items (e.g., "15th May")
   *
   * Ordering:
   * - order: Explicit sort order (lower = higher in list)
   */
  Initiative: a
    .model({
      name: a.string().required(),
      themeId: a.id().required(),
      theme: a.belongsTo('Theme', 'themeId'),
      parentId: a.id(),
      order: a.integer().default(0), // Explicit sort order
      liveDate: a.string(), // Go-live date for parent initiatives
      dueDate: a.string(), // UAT delivery date for child items
      notes: a.string().default(''),
      sequencingNotes: a.string().default(''),
      teamStates: a.json(), // JSON string of Record<teamId, FlowState>
      teamNotes: a.json(), // JSON string of Record<teamId, string> - notes per team
    })
    .authorization((allow) => [allow.publicApiKey()])
    .secondaryIndexes((index) => [index('themeId').name('byTheme')]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
