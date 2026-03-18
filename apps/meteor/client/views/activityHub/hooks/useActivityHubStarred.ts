import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

const PAGE_SIZE = 50;

type UseActivityHubStarredParams = {
	roomType: 'all' | RoomType;
};

export function useActivityHubStarred({ roomType }: UseActivityHubStarredParams) {
	const getStarredMessages = useEndpoint('GET', '/v1/activity-hub.starred-messages');

	return useInfiniteQuery({
		queryKey: ['activity-hub', 'starred-messages', roomType],
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const params: { count: number; offset: number; roomType?: RoomType } = {
				count: PAGE_SIZE,
				offset: pageParam,
			};
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			const result = await getStarredMessages(params);
			return { ...result, messages: result.messages.map(mapMessageFromApi) };
		},
		getNextPageParam: (lastPage) => {
			const nextOffset = lastPage.offset + lastPage.count;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
		select: (data) => ({
			...data,
			messages: data.pages.flatMap((page) => page.messages) as IMessage[],
		}),
	});
}
