# Activity Hub — Architecture & Implementation Notes

> **GSoC Proposal Reference Document**
> This document describes the design, implementation, and future roadmap for the Activity Hub feature in Rocket.Chat.

---

## 1. Problem Statement

In Rocket.Chat, users must check each channel, DM, and group individually to find their mentions, thread replies, starred messages, and reactions. There is no single place to see all cross-room activity. This creates friction for power users who are members of many rooms.

**Activity Hub** solves this by providing a unified, cross-room notification center — similar to Slack's "Activity" or GitHub's notification inbox.

---

## 2. Feature Overview

Activity Hub is a full-page view accessible from the main navbar. It aggregates six types of user activity across all rooms:

| Tab | Activity Type | Data Source |
|-----|--------------|-------------|
| All | Unified feed | `GET /v1/activity-hub.activities` |
| Mentions | Messages mentioning the user | `GET /v1/activity-hub.mentions` |
| Threads | Thread root messages the user replied to | `GET /v1/activity-hub.threads` |
| Reactions | User's messages that received reactions | `GET /v1/activity-hub.reactions` |
| Starred | Messages starred by the user | `GET /v1/activity-hub.starred-messages` |
| Invitations | Pending room invitations | `GET /v1/activity-hub.invitations` |

A two-column layout shows the activity feed on the left (420px) and a message/thread preview on the right.

---

## 3. Architecture

### 3.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Client Layer                                                   │
│                                                                 │
│  NavBar ──────────────────────────────────────────────────────  │
│  NavBarItemActivityHub (desktop) / NavBarPagesStackMenu (tablet)│
│                │                                                │
│                ▼                                                │
│  Router: /activity-hub/:tab?  (lazy-loaded, MainLayout)        │
│                │                                                │
│                ▼                                                │
│  ActivityHubPage  ──────────────────────────────────────────── │
│  ├── Controls (Tabs, Unread toggle, Room type filter)          │
│  ├── Left panel (420px)                                        │
│  │   ├── AllTab → ActivityList (Virtuoso, ActivityItem[])      │
│  │   ├── MentionsTab → ActivityMessageList (Virtuoso, IMessage[])│
│  │   ├── ThreadsTab → ActivityMessageList                      │
│  │   ├── ReactionsTab → ActivityMessageList                    │
│  │   ├── StarredMessagesTab → ActivityMessageList              │
│  │   └── InvitationsTab → Virtuoso (InvitationItem[])         │
│  └── Right panel (flex-grow)                                   │
│      └── ActivityPreviewPanel (thread or standalone message)   │
│                                                                 │
│  Data Hooks (useInfiniteQuery for all tabs):                   │
│  useActivityHubAll / Mentions / Threads / Reactions /          │
│  Starred / Invitations                                          │
└─────────────────────────────────────────────────────────────────┘
                         │  REST API (HTTP)
┌─────────────────────────────────────────────────────────────────┐
│  Shared Packages                                                │
│  rest-typings/v1/activity-hub.ts  — TypeScript types + AJV     │
│  model-typings/IMessagesModel.ts  — Model interface            │
│  i18n/en.i18n.json                — Translation keys           │
└─────────────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────────────┐
│  Server Layer                                                   │
│  api/server/v1/activity-hub.ts  — 7 REST endpoints             │
│  models/Messages.ts             — 4 new model methods + indexes │
│  MongoDB                        — messages, subscriptions, rooms│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow (Mentions Tab Example)

```
User navigates to /activity-hub/mentions
  │
  ▼
ActivityHubPage renders MentionsTab
  │
  ▼
useActivityHubMentions({ roomType, unread })
  │  useInfiniteQuery with queryKey ['activity-hub', 'mentions', roomType, unread]
  │
  ▼
GET /v1/activity-hub.mentions?count=50&offset=0
  │  AJV validates params via isActivityHubMentionsProps
  │
  ▼
Messages.findPaginatedVisibleByMention(username, rids?, options)
  │  MongoDB: { _hidden: { $ne: true }, 'mentions.username': username, rid?: { $in: rids } }
  │  Index: { 'mentions.username': 1 } (sparse)
  │
  ▼
normalizeMessagesForUser(messages, userId)
  │
  ▼
{ messages: IMessage[], count, offset, total }
  │
  ▼
ActivityMessageList renders grouped, virtualized message cards
  │
  ▼
User clicks a message → ActivityPreviewPanel fetches full thread
```

### 3.3 Dual Data Model

The feature uses two parallel data shapes:

| Shape | Used by | Source |
|-------|---------|--------|
| `IMessage` | Mentions, Threads, Reactions, Starred tabs | `@rocket.chat/core-typings` |
| `ActivityItem` | All (unified) tab | `@rocket.chat/rest-typings` |

`ActivityItem` is a server-normalized shape that includes `roomName`, `roomType`, `actor`, and `type` — fields that `IMessage` does not carry. This avoids N+1 room lookups on the client.

The `ActivityHubPage` bridges these with a `SelectedItem` discriminated union:

```typescript
type SelectedItem =
  | { kind: 'message'; message: IMessage }
  | { kind: 'activity'; activity: ActivityItem }
  | null;
```

---

## 4. API Design

### 4.1 Endpoint Summary

All endpoints are under `/api/v1/activity-hub.*` and require authentication (`authRequired: true`).

| Method | Endpoint | Returns | Supports `roomType` | Supports `unread` |
|--------|----------|---------|---------------------|-------------------|
| GET | `activity-hub.mentions` | `{ messages, count, offset, total }` | ✓ | ✓ |
| GET | `activity-hub.threads` | `{ messages, count, offset, total }` | ✓ | ✓ |
| GET | `activity-hub.reactions` | `{ messages, count, offset, total }` | ✓ | ✗ |
| GET | `activity-hub.starred-messages` | `{ messages, count, offset, total }` | ✓ | ✗ |
| GET | `activity-hub.invitations` | `{ invitations, count, offset, total }` | ✗ | ✗ |
| GET | `activity-hub.activities` | `{ activities: ActivityItem[], count, offset, total }` | ✓ | ✓ |
| POST | `activity-hub.markAllRead` | `{ success: boolean }` | — | — |

### 4.2 Pagination

All endpoints use `getPaginationItems(this.queryParams)` which respects the server-side `API_Upper_Count_Limit` and `API_Default_Count` settings. Response shape always includes `count`, `offset`, and `total`.

### 4.3 AJV Validation

Schemas are defined in `packages/rest-typings/src/v1/activity-hub.ts` using shared property objects to avoid duplication:

```typescript
const paginationProperties = { count, offset, sort };
const roomTypeProperty = { roomType: { enum: ['c', 'd', 'p', 'l'] } };
const unreadProperty = { unread: { type: 'boolean' } };

// Endpoints with full filtering
const baseFilterProperties = { ...paginationProperties, ...roomTypeProperty, ...unreadProperty };

// Endpoints with room type only (reactions, starred)
const roomTypeFilterProperties = { ...paginationProperties, ...roomTypeProperty };
```

All schemas use `additionalProperties: false` — unknown params return HTTP 400.

---

## 5. Model Layer

### 5.1 New Model Methods

Four new methods were added to `MessagesRaw` (implementing `IMessagesModel`):

```typescript
// Cross-room starred messages
findPaginatedStarredByUser(userId, rids?, options?): FindPaginated<FindCursor<IMessage>>

// Cross-room mentions
findPaginatedVisibleByMention(username, rids?, options?): FindPaginated<FindCursor<IMessage>>

// Cross-room threads (user is a participant)
findPaginatedThreadsByUser(userId, threadIds?, rids?, options?): FindPaginated<FindCursor<IMessage>>

// Cross-room messages with reactions
findPaginatedReactionsByUser(userId, rids?, options?): FindPaginated<FindCursor<IMessage>>
```

The optional `rids` (room ID array) and `threadIds` parameters allow the API layer to apply room-type or unread filters without duplicating query logic.

### 5.2 New MongoDB Indexes

Two new indexes were added to the `messages` collection:

```typescript
// Partial filter index for reactions-by-user queries
// Only indexes documents that actually have reactions (avoids indexing ~99% of messages)
{
  key: { 'u._id': 1 },
  partialFilterExpression: { reactions: { $exists: true } },
  name: 'activity_hub_reactions_by_user',
}

// Sparse index for threads-by-user queries
// Only indexes thread root messages (those with a replies array)
{ key: { replies: 1 }, sparse: true }
```

**Why partial filter over compound index?**
The original `{ 'u._id': 1, 'reactions': 1 }` compound index would index every message (since `u._id` is always present). The partial filter expression `{ reactions: { $exists: true } }` limits the index to only messages that have reactions, which is a small fraction of total messages. This reduces index size and write overhead significantly.

---

## 6. Frontend Architecture

### 6.1 Component Hierarchy

```
ActivityHubPage
├── PageHeader (title, Mark all as read, Close)
├── Controls (Tabs, Unread toggle, Room type Select)
├── Left panel (width: x420)
│   ├── AllTab
│   │   └── ActivityList (Virtuoso)
│   │       └── ActivityCard (shared component)
│   ├── MentionsTab / ThreadsTab / ReactionsTab / StarredMessagesTab
│   │   └── ActivityMessageList (Virtuoso, grouped by room)
│   │       └── GroupRow
│   │           └── ActivityCard (shared component)
│   └── InvitationsTab
│       └── Virtuoso
│           └── InvitationItem (Accept/Decline)
└── Right panel (flex-grow)
    └── ActivityPreviewPanel
        └── Virtuoso
            └── PreviewMessageCard (Fuselage Message composition)
```

### 6.2 Shared ActivityCard Component

Both `ActivityList` (for `ActivityItem`) and `ActivityMessageList` (for `IMessage`) use a single shared `ActivityCard` component (`components/ActivityCard.tsx`). The parent components build the display strings and pass them as props, keeping the card itself purely presentational.

### 6.3 Infinite Scroll Pagination

All six data hooks use `useInfiniteQuery` from `@tanstack/react-query`. Each tab passes an `onEndReached` callback to the list component's `Virtuoso` instance, which triggers `fetchNextPage()` when the user scrolls to the bottom.

```typescript
// Pattern used in all hooks
return useInfiniteQuery({
  queryKey: ['activity-hub', 'mentions', roomType, unread],
  initialPageParam: 0,
  queryFn: async ({ pageParam }) => getMentions({ count: 50, offset: pageParam, ... }),
  getNextPageParam: (lastPage) => {
    const nextOffset = lastPage.offset + lastPage.count;
    return nextOffset < lastPage.total ? nextOffset : undefined;
  },
  select: (data) => ({
    ...data,
    messages: data.pages.flatMap((page) => page.messages),
  }),
});
```

### 6.4 Cache Invalidation

The "Mark all as read" mutation invalidates all queries with the `['activity-hub']` key prefix:

```typescript
onSuccess: () => {
  void queryClient.invalidateQueries({ queryKey: ['activity-hub'] });
}
```

This causes all six tabs to refetch, ensuring the unread state is consistent across the entire hub.

---

## 7. Routing

The route is registered as `/activity-hub/:tab?` in `routes.tsx`. The tab parameter is optional — when absent, the page redirects to `/activity-hub/all`.

The TypeScript type declaration on `IRouterPaths` constrains `pathname` to only the six valid tab slugs, providing compile-time safety:

```typescript
'activity-hub': {
  pathname: `/activity-hub${`/${'all' | 'mentions' | 'threads' | 'reactions' | 'starred' | 'invitations'}` | ''}`;
  pattern: '/activity-hub/:tab?';
};
```

---

## 8. Performance Considerations

### 8.1 Virtualized Rendering

All lists use `react-virtuoso` (`Virtuoso` component) with `VirtualizedScrollbars`. Only the visible items are rendered in the DOM, regardless of how many items are loaded.

### 8.2 Indexed Queries

Every MongoDB query in the Activity Hub hits an index:

| Query | Index |
|-------|-------|
| Mentions by username | `{ 'mentions.username': 1 }` (sparse) |
| Starred by user | `{ 'starred._id': 1 }` (sparse) |
| Threads by user | `{ replies: 1 }` (sparse) |
| Reactions by user | `{ 'u._id': 1 }` (partial filter: reactions exists) |
| Invitations | `{ 'u._id': 1, status: 1 }` (via subscriptions) |

### 8.3 Unified Feed: Current Strategy & Future Migration

The `activities` endpoint currently uses an **in-memory merge strategy**:
1. Fetch up to 500 documents per activity type (5 types × 500 = 2500 max docs)
2. Normalize to `ActivityItem[]`
3. Sort by timestamp descending in Node.js
4. Slice for pagination

**Limitation:** This does not scale for users with thousands of activities. Deep pagination (large `offset`) fetches many documents only to discard most of them.

**Planned migration (GSoC full implementation):** Replace with a MongoDB aggregation pipeline using `$unionWith`:

```javascript
db.messages.aggregate([
  { $match: { 'mentions.username': username, _hidden: { $ne: true } } },
  { $addFields: { activityType: 'mention', activityTs: '$ts' } },
  { $unionWith: {
    coll: 'messages',
    pipeline: [
      { $match: { replies: userId, tcount: { $exists: true }, _hidden: { $ne: true } } },
      { $addFields: { activityType: 'thread', activityTs: '$tlm' } }
    ]
  }},
  // ... more $unionWith stages for reactions, starred, invitations
  { $sort: { activityTs: -1 } },
  { $skip: offset },
  { $limit: count }
])
```

This enables true cursor-based pagination at the database level with O(log n) complexity instead of O(n) in-memory sorting.

---

## 9. Accessibility

All interactive card elements have:
- `role='button'`
- `tabIndex={0}`
- `aria-pressed` (for selection state)
- `onKeyDown` handler for Enter and Space keys

Group headers in `ActivityMessageList` have `aria-expanded` for the collapse/expand state.

---

## 10. i18n

All user-facing strings use `useTranslation()` from `react-i18next`. New translation keys are defined in `packages/i18n/src/locales/en.i18n.json`.

---

## 11. Files Changed

| File | Purpose |
|------|---------|
| `apps/meteor/app/api/server/v1/activity-hub.ts` | 7 REST endpoints |
| `apps/meteor/app/api/server/index.ts` | Side-effect import |
| `packages/rest-typings/src/v1/activity-hub.ts` | Types, AJV schemas, validators |
| `packages/rest-typings/src/index.ts` | Merge into global Endpoints |
| `packages/model-typings/src/models/IMessagesModel.ts` | 4 new model interface methods |
| `packages/models/src/models/Messages.ts` | 4 model implementations + 2 indexes |
| `apps/meteor/client/views/activityHub/ActivityHubPage.tsx` | Root page component |
| `apps/meteor/client/views/activityHub/components/ActivityCard.tsx` | Shared card component |
| `apps/meteor/client/views/activityHub/components/ActivityList.tsx` | Unified feed list |
| `apps/meteor/client/views/activityHub/components/ActivityMessageList.tsx` | Room-grouped message list |
| `apps/meteor/client/views/activityHub/components/ActivityPreviewPanel.tsx` | Right-side preview |
| `apps/meteor/client/views/activityHub/components/InvitationItem.tsx` | Invitation card |
| `apps/meteor/client/views/activityHub/components/PreviewMessageCard.tsx` | Preview message row |
| `apps/meteor/client/views/activityHub/tabs/*.tsx` | 6 tab components |
| `apps/meteor/client/views/activityHub/hooks/*.ts` | 6 data hooks (useInfiniteQuery) |
| `apps/meteor/client/navbar/NavBarPagesGroup/NavBarItemActivityHub.tsx` | Desktop navbar button |
| `apps/meteor/client/navbar/NavBarPagesGroup/NavBarPagesGroup.tsx` | Navbar group |
| `apps/meteor/client/navbar/NavBarPagesGroup/NavBarPagesStackMenu.tsx` | Tablet stack menu |
| `apps/meteor/client/startup/routes.tsx` | Route registration |
| `apps/meteor/tests/end-to-end/api/activity-hub.ts` | E2E API tests |
| `packages/i18n/src/locales/en.i18n.json` | Translation keys |
