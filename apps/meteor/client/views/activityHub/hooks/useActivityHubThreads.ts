import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery } from '@tanstack/react-query';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';

const PAGE_SIZE = 50;

type UseActivityHubThreadsParams = {
	roomType: 'all' | RoomType;
	unread: boolean;
};

export function useActivityHubThreads({ roomType, unread }: UseActivityHubThreadsParams) {
	const getThreads = useEndpoint('GET', '/v1/activity-hub.threads');

	return useInfiniteQuery({
		queryKey: ['activity-hub', 'threads', roomType, unread],
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const params: { count: number; offset: number; roomType?: RoomType; unread?: boolean } = {
				count: PAGE_SIZE,
				offset: pageParam,
			};
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			if (unread) {
				params.unread = true;
			}
			const result = await getThreads(params);
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
