import type { RoomType } from '@rocket.chat/core-typings';
import { Messages, Users, Subscriptions, Rooms } from '@rocket.chat/models';
import type { ActivityItem, ActivityType } from '@rocket.chat/rest-typings';
import {
	isActivityHubMentionsProps,
	isActivityHubStarredMessagesProps,
	isActivityHubThreadsProps,
	isActivityHubReactionsProps,
	isActivityHubInvitationsProps,
	isActivityHubActivitiesProps,
	isActivityHubMarkAllReadProps,
} from '@rocket.chat/rest-typings';

import { readMessages } from '../../../../server/lib/readMessages';
import { normalizeMessagesForUser } from '../../../utils/server/lib/normalizeMessagesForUser';
import { API } from '../api';
import { getPaginationItems } from '../helpers/getPaginationItems';

async function getRoomIdsByType(userId: string, roomType: RoomType): Promise<string[]> {
	const subscriptions = await Subscriptions.findByUserIdAndRoomType(userId, roomType, { projection: { rid: 1 } }).toArray();
	return subscriptions.map((sub) => sub.rid);
}

API.v1.addRoute(
	'activity-hub.mentions',
	{ authRequired: true, validateParams: isActivityHubMentionsProps },
	{
		async get() {
			const { sort } = await this.parseJsonQuery();
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { roomType, unread } = this.queryParams;

			const user = await Users.findOneById(this.userId, { projection: { username: 1 } });
			if (!user?.username) {
				return API.v1.unauthorized();
			}

			let rids: string[] | undefined;
			if (roomType) {
				rids = await getRoomIdsByType(this.userId, roomType as RoomType);
			} else if (unread === true) {
				const subs = await Subscriptions.find(
					{ 'u._id': this.userId, $or: [{ userMentions: { $gt: 0 } }, { groupMentions: { $gt: 0 } }] },
					{ projection: { rid: 1 } },
				).toArray();
				rids = subs.map((s) => s.rid);
			}

			const { cursor, totalCount } = Messages.findPaginatedVisibleByMention(user.username, rids, {
				sort: sort || { ts: -1 },
				skip: offset,
				limit: count,
			});

			const [messages, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				messages: await normalizeMessagesForUser(messages, this.userId),
				count: messages.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.starred-messages',
	{ authRequired: true, validateParams: isActivityHubStarredMessagesProps },
	{
		async get() {
			const { sort } = await this.parseJsonQuery();
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { roomType } = this.queryParams;

			const rids = roomType ? await getRoomIdsByType(this.userId, roomType as RoomType) : undefined;

			const { cursor, totalCount } = Messages.findPaginatedStarredByUser(this.userId, rids, {
				sort: sort || { ts: -1 },
				skip: offset,
				limit: count,
			});

			const [messages, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				messages: await normalizeMessagesForUser(messages, this.userId),
				count: messages.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.threads',
	{ authRequired: true, validateParams: isActivityHubThreadsProps },
	{
		async get() {
			const { sort } = await this.parseJsonQuery();
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { roomType, unread } = this.queryParams;

			const rids = roomType ? await getRoomIdsByType(this.userId, roomType as RoomType) : undefined;

			let threadIds: string[] | undefined;
			if (unread === true) {
				const subs = await Subscriptions.find(
					{ 'u._id': this.userId, tunread: { $exists: true, $not: { $size: 0 } } },
					{ projection: { tunread: 1 } },
				).toArray();
				threadIds = subs.flatMap((s) => s.tunread ?? []);
			}

			const { cursor, totalCount } = Messages.findPaginatedThreadsByUser(this.userId, threadIds, rids, {
				sort: sort || { tlm: -1 },
				skip: offset,
				limit: count,
			});

			const [messages, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				messages: await normalizeMessagesForUser(messages, this.userId),
				count: messages.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.reactions',
	{ authRequired: true, validateParams: isActivityHubReactionsProps },
	{
		async get() {
			const { sort } = await this.parseJsonQuery();
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { roomType } = this.queryParams;

			const rids = roomType ? await getRoomIdsByType(this.userId, roomType as RoomType) : undefined;

			const { cursor, totalCount } = Messages.findPaginatedReactionsByUser(this.userId, rids, {
				sort: sort || { ts: -1 },
				skip: offset,
				limit: count,
			});

			const [messages, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				messages: await normalizeMessagesForUser(messages, this.userId),
				count: messages.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.invitations',
	{ authRequired: true, validateParams: isActivityHubInvitationsProps },
	{
		async get() {
			const { offset, count } = await getPaginationItems(this.queryParams);

			const { cursor, totalCount } = Subscriptions.findPaginated(
				{
					'u._id': this.userId,
					'status': 'INVITED',
				},
				{
					sort: { ts: -1 },
					skip: offset,
					limit: count,
				},
			);

			const [invitations, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				invitations,
				count: invitations.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.activities',
	{ authRequired: true, validateParams: isActivityHubActivitiesProps },
	{
		async get() {
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { roomType, unread } = this.queryParams;

			const user = await Users.findOneById(this.userId, { projection: { username: 1 } });
			if (!user?.username) {
				return API.v1.unauthorized();
			}

			const rids = roomType ? await getRoomIdsByType(this.userId, roomType as RoomType) : undefined;

			// Resolve unread room/thread sets for filtering
			let unreadMentionRids: string[] | undefined;
			let unreadThreadIds: string[] | undefined;
			if (unread === true) {
				const [mentionSubs, threadSubs] = await Promise.all([
					Subscriptions.find(
						{ 'u._id': this.userId, $or: [{ userMentions: { $gt: 0 } }, { groupMentions: { $gt: 0 } }] },
						{ projection: { rid: 1 } },
					).toArray(),
					Subscriptions.find(
						{ 'u._id': this.userId, tunread: { $exists: true, $not: { $size: 0 } } },
						{ projection: { tunread: 1 } },
					).toArray(),
				]);
				unreadMentionRids = mentionSubs.map((s) => s.rid);
				unreadThreadIds = threadSubs.flatMap((s) => s.tunread ?? []);
			}

			// Fetch all activity types in parallel, merge in-memory, then slice for pagination.
			// fetchLimit is capped at 500 to prevent unbounded memory usage on deep pagination.
			// TODO(gsoc): replace with a DB-level $unionWith aggregation pipeline for scalable cursor-based pagination.
			const fetchLimit = Math.min((count || 50) + (offset || 0) + 50, 500);

			const [mentionDocs, threadDocs, reactionDocs, starredDocs, invitationDocs] = await Promise.all([
				Messages.findPaginatedVisibleByMention(user.username, unreadMentionRids ?? rids, {
					sort: { ts: -1 },
					limit: fetchLimit,
				}).cursor.toArray(),
				Messages.findPaginatedThreadsByUser(this.userId, unreadThreadIds, rids, {
					sort: { tlm: -1 },
					limit: fetchLimit,
				}).cursor.toArray(),
				Messages.findPaginatedReactionsByUser(this.userId, rids, {
					sort: { ts: -1 },
					limit: fetchLimit,
				}).cursor.toArray(),
				Messages.findPaginatedStarredByUser(this.userId, rids, {
					sort: { ts: -1 },
					limit: fetchLimit,
				}).cursor.toArray(),
				unread !== true
					? Subscriptions.find({ 'u._id': this.userId, 'status': 'INVITED' }, { sort: { ts: -1 }, limit: fetchLimit }).toArray()
					: Promise.resolve([]),
			]);

			// Build a room name/type cache from a single batched query
			const allRids = new Set([
				...mentionDocs.map((m) => m.rid),
				...threadDocs.map((m) => m.rid),
				...reactionDocs.map((m) => m.rid),
				...starredDocs.map((m) => m.rid),
				...invitationDocs.map((s) => s.rid),
			]);

			const roomDocs = await Rooms.findByIds([...allRids], { projection: { name: 1, fname: 1, t: 1 } }).toArray();
			const roomMap = new Map(roomDocs.map((r) => [r._id, r]));

			const getRoom = (rid: string) => roomMap.get(rid);

			// Normalize each activity type to a unified ActivityItem shape
			const items: ActivityItem[] = [];
			const seenMessages = new Set<string>();

			const addMessageItem = (type: ActivityType, doc: (typeof mentionDocs)[number], ts: Date) => {
				const key = `${type}:${doc._id}`;
				if (seenMessages.has(key)) return;
				seenMessages.add(key);
				const room = getRoom(doc.rid);
				items.push({
					_id: key,
					type,
					rid: doc.rid,
					roomName: room?.fname || room?.name || doc.rid,
					roomType: (room?.t || 'c') as RoomType,
					msg: doc.msg,
					msgId: doc._id,
					actor: { _id: doc.u._id, username: doc.u.username, name: doc.u.name },
					ts,
					unread: false,
				});
			};

			for (const doc of mentionDocs) addMessageItem('mention', doc, doc.ts);
			for (const doc of threadDocs) addMessageItem('thread', doc, doc.tlm || doc.ts);
			for (const doc of reactionDocs) addMessageItem('reaction', doc, doc.ts);
			for (const doc of starredDocs) addMessageItem('star', doc, doc.ts);

			for (const inv of invitationDocs) {
				const room = getRoom(inv.rid);
				const inviter = inv.inviter;
				items.push({
					_id: `invitation:${inv._id}`,
					type: 'invitation',
					rid: inv.rid,
					roomName: room?.fname || room?.name || inv.name || inv.rid,
					roomType: (room?.t || inv.t || 'c') as RoomType,
					msg: undefined,
					msgId: undefined,
					actor: inviter
						? { _id: inviter._id, username: inviter.username, name: inviter.name }
						: { _id: '', username: 'unknown' },
					ts: inv.ts,
					unread: true,
				});
			}

			// Sort unified feed by timestamp descending
			items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

			const total = items.length;
			const paginated = items.slice(offset || 0, (offset || 0) + (count || 50));

			return API.v1.success({
				activities: paginated,
				count: paginated.length,
				offset: offset || 0,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'activity-hub.markAllRead',
	{ authRequired: true, validateParams: isActivityHubMarkAllReadProps },
	{
		async post() {
			const alertedSubs = await Subscriptions.find(
				{
					'u._id': this.userId,
					$or: [{ alert: true }, { userMentions: { $gt: 0 } }, { groupMentions: { $gt: 0 } }],
				},
				{ projection: { rid: 1 } },
			).toArray();

			const rooms = await Rooms.findByIds(
				alertedSubs.map((s) => s.rid),
				{ projection: { _id: 1, t: 1 } },
			).toArray();

			await Promise.all(rooms.map((room) => readMessages(room, this.userId, true)));

			return API.v1.success({ success: true });
		},
	},
);
