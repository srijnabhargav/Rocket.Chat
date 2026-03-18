import type { RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

type UseActivityHubThreadsParams = {
	roomType: 'all' | RoomType;
	unread: boolean;
};

export function useActivityHubThreads({ roomType, unread }: UseActivityHubThreadsParams) {
	const getThreads = useEndpoint('GET', '/v1/activity-hub.threads');

	return useQuery({
		queryKey: ['activity-hub', 'threads', roomType, unread],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType; unread?: boolean } = { count: 50, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			if (unread) {
				params.unread = true;
			}
			const result = await getThreads(params);
			return result.messages.map(mapMessageFromApi);
		},
	});
}
