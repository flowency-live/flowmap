import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * FlowMap Data Schema
 *
 * Models:
 * - Theme: Portfolio groupings (e.g., "M&S Onboarding", "NatWest Onboarding")
 * - Team: Delivery teams (UPJ, UIE, UNC, Logan, DataE, DataS)
 * - Initiative: Work items with team-specific flow states
 * - Invitation: Single-use invite links for user onboarding
 *
 * Flow States: N/A | N/S | Discovery | Ready | Constrained | Doing | Done | Blocked
 *
 * Real-time: Subscriptions auto-generated for all mutations
 * Authorization: Cognito User Pool (authenticated users only)
 */
const schema = a.schema({
  /**
   * Invitation - Single-use invite links for user onboarding
   *
   * Flow:
   * 1. Admin creates invitation with email
   * 2. System generates unique code (UUID)
   * 3. Admin shares link: /invite?code={code}
   * 4. User visits link, pre-fills email, sets password
   * 5. Cognito pre-signup trigger validates invitation
   * 6. On successful signup, invitation status → 'accepted'
   */
  Invitation: a
    .model({
      email: a.email().required(),
      code: a.string().required(),
      status: a.enum(['pending', 'accepted', 'revoked']),
      invitedBy: a.string(),
      invitedAt: a.datetime(),
      acceptedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [
      index('code').name('byCode'),
      index('email').name('byEmail'),
    ]),

  /**
   * Theme - Portfolio grouping for initiatives (brand)
   */
  Theme: a
    .model({
      name: a.string().required(),
      faviconUrl: a.string(), // URL to brand favicon/logo
      initiatives: a.hasMany('Initiative', 'themeId'),
    })
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Team - Delivery team that works on initiatives
   *
   * capacityConfig: JSON object storing team capacity settings
   * { streams: 2, streamPct: 45, bauPct: 10 }
   * - streams: Number of parallel work streams
   * - streamPct: Capacity percentage per stream
   * - bauPct: BAU allocation percentage
   */
  Team: a
    .model({
      name: a.string().required(),
      isPrimaryConstraint: a.boolean().default(false),
      capacityConfig: a.json(), // JSON of TeamCapacity
    })
    .authorization((allow) => [allow.authenticated()]),

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
      faviconUrl: a.string(), // Brand favicon/logo URL for parent initiatives
      liveDate: a.string(), // Go-live date for parent initiatives
      dueDate: a.string(), // UAT delivery date for child items
      notes: a.string().default(''),
      sequencingNotes: a.string().default(''),
      teamStates: a.json(), // JSON string of Record<teamId, FlowState>
      teamEfforts: a.json(), // JSON string of Record<teamId, Effort>
      teamNotes: a.json(), // JSON string of Record<teamId, string> - notes per team
      teamStartDates: a.json(), // JSON string of Record<teamId, string> - estimated start dates per team
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [index('themeId').name('byTheme')]),

  /**
   * Dependency - Cross-initiative blocking relationships
   *
   * Tracks when one initiative blocks another:
   * - fromInitiativeId: The blocking initiative (must complete first)
   * - toInitiativeId: The blocked initiative (waiting on fromInitiative)
   *
   * Example: UIE's "Insurer Dynamic Display" blocks UPJ's "Exclude Rebroke"
   */
  Dependency: a
    .model({
      fromInitiativeId: a.id().required(), // The blocking initiative
      toInitiativeId: a.id().required(), // The blocked initiative
      notes: a.string(), // Optional description of the dependency
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [
      index('fromInitiativeId').name('byFromInitiative'),
      index('toInitiativeId').name('byToInitiative'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
