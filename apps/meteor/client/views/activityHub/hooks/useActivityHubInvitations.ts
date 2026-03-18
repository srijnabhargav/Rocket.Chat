import type { ISubscription } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 50;

export function useActivityHubInvitations() {
	const getInvitations = useEndpoint('GET', '/v1/activity-hub.invitations');

	return useInfiniteQuery({
		queryKey: ['activity-hub', 'invitations'],
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const result = await getInvitations({ count: PAGE_SIZE, offset: pageParam });
			return { ...result, invitations: result.invitations as ISubscription[] };
		},
		getNextPageParam: (lastPage) => {
			const nextOffset = lastPage.offset + lastPage.count;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
		select: (data) => ({
			...data,
			invitations: data.pages.flatMap((page) => page.invitations) as ISubscription[],
		}),
	});
}
