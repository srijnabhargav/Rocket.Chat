import type { RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

type UseActivityHubStarredParams = {
	roomType: 'all' | RoomType;
};

export function useActivityHubStarred({ roomType }: UseActivityHubStarredParams) {
	const getStarredMessages = useEndpoint('GET', '/v1/activity-hub.starred-messages');

	return useQuery({
		queryKey: ['activity-hub', 'starred-messages', roomType],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType } = { count: 100, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			const result = await getStarredMessages(params);
			return result.messages.map(mapMessageFromApi);
		},
	});
}
