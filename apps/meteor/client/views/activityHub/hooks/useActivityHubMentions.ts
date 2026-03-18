import type { RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

type UseActivityHubMentionsParams = {
	roomType: 'all' | RoomType;
	unread: boolean;
};

export function useActivityHubMentions({ roomType, unread }: UseActivityHubMentionsParams) {
	const getMentions = useEndpoint('GET', '/v1/activity-hub.mentions');

	return useQuery({
		queryKey: ['activity-hub', 'mentions', roomType, unread],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType; unread?: boolean } = { count: 50, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			if (unread) {
				params.unread = true;
			}
			const result = await getMentions(params);
			return result.messages.map(mapMessageFromApi);
		},
	});
}
