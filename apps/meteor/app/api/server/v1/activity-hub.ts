import { Messages, Users } from '@rocket.chat/models';
import { isActivityHubMentionsProps, isActivityHubStarredMessagesProps } from '@rocket.chat/rest-typings';

import { normalizeMessagesForUser } from '../../../utils/server/lib/normalizeMessagesForUser';
import { API } from '../api';
import { getPaginationItems } from '../helpers/getPaginationItems';

API.v1.addRoute(
	'activity-hub.mentions',
	{ authRequired: true, validateParams: isActivityHubMentionsProps },
	{
		async get() {
			const { sort } = await this.parseJsonQuery();
			const { offset, count } = await getPaginationItems(this.queryParams);

			const user = await Users.findOneById(this.userId, { projection: { username: 1 } });
			if (!user?.username) {
				return API.v1.unauthorized();
			}

			const { cursor, totalCount } = Messages.findPaginatedVisibleByMention(user.username, {
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

			const { cursor, totalCount } = Messages.findPaginatedStarredByUser(this.userId, {
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

