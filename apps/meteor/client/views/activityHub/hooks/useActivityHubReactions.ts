import type { RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

type UseActivityHubReactionsParams = {
	roomType: 'all' | RoomType;
};

export function useActivityHubReactions({ roomType }: UseActivityHubReactionsParams) {
	const getReactions = useEndpoint('GET', '/v1/activity-hub.reactions');

	return useQuery({
		queryKey: ['activity-hub', 'reactions', roomType],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType } = { count: 50, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			const result = await getReactions(params);
			return result.messages.map(mapMessageFromApi);
		},
	});
}
