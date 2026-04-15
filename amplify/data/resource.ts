import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * FlowMap Data Schema
 *
 * Models:
 * - Theme: Portfolio groupings (e.g., "NatWest", "M&S")
 * - Team: Delivery teams (e.g., "UPJ", "UPC")
 * - Initiative: Work items with team-specific flow states
 *
 * Flow States: NOT_STARTED | IN_DISCOVERY | READY | IN_FLIGHT | UAT | DONE | NA
 *
 * Real-time: Subscriptions auto-generated for all mutations
 */
const schema = a.schema({
  /**
   * Theme - Portfolio grouping for initiatives
   */
  Theme: a
    .model({
      name: a.string().required(),
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
   * teamStates is stored as JSON string: {"team-id-1": "READY", "team-id-2": "IN_FLIGHT"}
   * This allows flexible per-team state tracking without a separate join table.
   */
  Initiative: a
    .model({
      name: a.string().required(),
      themeId: a.id().required(),
      theme: a.belongsTo('Theme', 'themeId'),
      parentId: a.id(),
      notes: a.string().default(''),
      sequencingNotes: a.string().default(''),
      teamStates: a.json(), // JSON string of Record<teamId, FlowState>
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
