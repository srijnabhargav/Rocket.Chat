import type { IMessage, ISubscription, RoomType } from '@rocket.chat/core-typings';

import { ajv } from './Ajv';

export type ActivityType = 'mention' | 'thread' | 'reaction' | 'star' | 'invitation';

export type ActivityItem = {
	_id: string;
	type: ActivityType;
	rid: string;
	roomName: string;
	roomType: RoomType;
	msg?: string;
	msgId?: string;
	actor: { _id: string; username: string; name?: string };
	ts: Date;
	unread: boolean;
};

const ROOM_TYPE_ENUM = ['c', 'd', 'p', 'l'] as const;

const paginationProperties = {
	count: { type: 'number', nullable: true },
	offset: { type: 'number', nullable: true },
	sort: { type: 'string', nullable: true },
} as const;

const roomTypeProperty = {
	roomType: { type: 'string', enum: ROOM_TYPE_ENUM, nullable: true },
} as const;

const unreadProperty = {
	unread: { type: 'boolean', nullable: true },
} as const;

// Base properties shared by endpoints that support roomType + unread filtering
const baseFilterProperties = {
	...paginationProperties,
	...roomTypeProperty,
	...unreadProperty,
};

// Base properties for endpoints that support roomType filtering but not unread
const roomTypeFilterProperties = {
	...paginationProperties,
	...roomTypeProperty,
};

type ActivityHubBaseParams = {
	count?: number;
	offset?: number;
	sort?: string;
	roomType?: RoomType;
	unread?: boolean;
};

type ActivityHubRoomTypeParams = {
	count?: number;
	offset?: number;
	sort?: string;
	roomType?: RoomType;
};

type ActivityHubMentionsParams = ActivityHubBaseParams;

const ActivityHubMentionsSchema = {
	type: 'object',
	properties: baseFilterProperties,
	additionalProperties: false,
};

export const isActivityHubMentionsProps = ajv.compile<ActivityHubMentionsParams>(ActivityHubMentionsSchema);

type ActivityHubStarredMessagesParams = ActivityHubRoomTypeParams;

const ActivityHubStarredMessagesSchema = {
	type: 'object',
	properties: roomTypeFilterProperties,
	additionalProperties: false,
};

export const isActivityHubStarredMessagesProps = ajv.compile<ActivityHubStarredMessagesParams>(ActivityHubStarredMessagesSchema);

type ActivityHubThreadsParams = ActivityHubBaseParams;

const ActivityHubThreadsSchema = {
	type: 'object',
	properties: baseFilterProperties,
	additionalProperties: false,
};

export const isActivityHubThreadsProps = ajv.compile<ActivityHubThreadsParams>(ActivityHubThreadsSchema);

type ActivityHubReactionsParams = ActivityHubRoomTypeParams;

const ActivityHubReactionsSchema = {
	type: 'object',
	properties: roomTypeFilterProperties,
	additionalProperties: false,
};

export const isActivityHubReactionsProps = ajv.compile<ActivityHubReactionsParams>(ActivityHubReactionsSchema);

type ActivityHubInvitationsParams = {
	count?: number;
	offset?: number;
	sort?: string;
};

const ActivityHubInvitationsSchema = {
	type: 'object',
	properties: paginationProperties,
	additionalProperties: false,
};

export const isActivityHubInvitationsProps = ajv.compile<ActivityHubInvitationsParams>(ActivityHubInvitationsSchema);

type ActivityHubActivitiesParams = {
	count?: number;
	offset?: number;
	roomType?: RoomType;
	unread?: boolean;
};

const ActivityHubActivitiesSchema = {
	type: 'object',
	properties: {
		count: { type: 'number', nullable: true },
		offset: { type: 'number', nullable: true },
		...roomTypeProperty,
		...unreadProperty,
	},
	additionalProperties: false,
};

export const isActivityHubActivitiesProps = ajv.compile<ActivityHubActivitiesParams>(ActivityHubActivitiesSchema);

export const isActivityHubMarkAllReadProps = ajv.compile<Record<string, never>>({
	type: 'object',
	properties: {},
	additionalProperties: false,
});

export type ActivityHubEndpoints = {
	'/v1/activity-hub.mentions': {
		GET: (params: ActivityHubMentionsParams) => {
			messages: IMessage[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.starred-messages': {
		GET: (params: ActivityHubStarredMessagesParams) => {
			messages: IMessage[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.threads': {
		GET: (params: ActivityHubThreadsParams) => {
			messages: IMessage[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.reactions': {
		GET: (params: ActivityHubReactionsParams) => {
			messages: IMessage[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.invitations': {
		GET: (params: ActivityHubInvitationsParams) => {
			invitations: ISubscription[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.activities': {
		GET: (params: ActivityHubActivitiesParams) => {
			activities: ActivityItem[];
			count: number;
			offset: number;
			total: number;
		};
	};
	'/v1/activity-hub.markAllRead': {
		POST: (params: Record<string, never>) => { success: boolean };
	};
};
