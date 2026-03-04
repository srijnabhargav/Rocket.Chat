import type { RoomType } from '@rocket.chat/core-typings';
import { Messages, Users, Subscriptions } from '@rocket.chat/models';
import { isActivityHubMentionsProps, isActivityHubStarredMessagesProps } from '@rocket.chat/rest-typings';

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
			const { roomType } = this.queryParams;

			const user = await Users.findOneById(this.userId, { projection: { username: 1 } });
			if (!user?.username) {
				return API.v1.unauthorized();
			}

			const ridFilter = roomType ? { rid: { $in: await getRoomIdsByType(this.userId, roomType as RoomType) } } : {};

			const { cursor, totalCount } = Messages.findPaginated(
				{
					'_hidden': { $ne: true },
					'mentions.username': user.username,
					...ridFilter,
				},
				{
					sort: sort || { ts: -1 },
					skip: offset,
					limit: count,
				},
			);

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

			const ridFilter = roomType ? { rid: { $in: await getRoomIdsByType(this.userId, roomType as RoomType) } } : {};

			const { cursor, totalCount } = Messages.findPaginated(
				{
					'_hidden': { $ne: true },
					'starred._id': this.userId,
					...ridFilter,
				},
				{
					sort: sort || { ts: -1 },
					skip: offset,
					limit: count,
				},
			);

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

