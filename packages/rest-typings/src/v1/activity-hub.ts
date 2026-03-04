import type { IMessage, RoomType } from '@rocket.chat/core-typings';

import { ajv } from './Ajv';

type ActivityHubMentionsParams = {
	count?: number;
	offset?: number;
	sort?: string;
	roomType?: RoomType;
};

const ActivityHubMentionsSchema = {
	type: 'object',
	properties: {
		count: {
			type: 'number',
			nullable: true,
		},
		offset: {
			type: 'number',
			nullable: true,
		},
		sort: {
			type: 'string',
			nullable: true,
		},
		roomType: {
			type: 'string',
			enum: ['c', 'd', 'p', 'l'],
			nullable: true,
		},
	},
	additionalProperties: false,
};

export const isActivityHubMentionsProps = ajv.compile<ActivityHubMentionsParams>(ActivityHubMentionsSchema);

type ActivityHubStarredMessagesParams = {
	count?: number;
	offset?: number;
	sort?: string;
	roomType?: RoomType;
};

const ActivityHubStarredMessagesSchema = {
	type: 'object',
	properties: {
		count: {
			type: 'number',
			nullable: true,
		},
		offset: {
			type: 'number',
			nullable: true,
		},
		sort: {
			type: 'string',
			nullable: true,
		},
		roomType: {
			type: 'string',
			enum: ['c', 'd', 'p', 'l'],
			nullable: true,
		},
	},
	additionalProperties: false,
};

export const isActivityHubStarredMessagesProps = ajv.compile<ActivityHubStarredMessagesParams>(ActivityHubStarredMessagesSchema);

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
};

