import type { RoomType } from '@rocket.chat/core-typings';
import type { ActivityItem } from '@rocket.chat/rest-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 50;

type UseActivityHubAllParams = {
	roomType: 'all' | RoomType;
	unread: boolean;
};

export function useActivityHubAll({ roomType, unread }: UseActivityHubAllParams) {
	const getActivities = useEndpoint('GET', '/v1/activity-hub.activities');

	return useInfiniteQuery({
		queryKey: ['activity-hub', 'all', roomType, unread],
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
			return getActivities(params);
		},
		getNextPageParam: (lastPage) => {
			const nextOffset = lastPage.offset + lastPage.count;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
		select: (data) => ({
			...data,
			activities: data.pages.flatMap((page) => page.activities) as ActivityItem[],
		}),
	});
}
