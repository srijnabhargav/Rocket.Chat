import type { ISubscription } from '@rocket.chat/core-typings';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

export function useActivityHubInvitations() {
	const getInvitations = useEndpoint('GET', '/v1/activity-hub.invitations');

	return useQuery({
		queryKey: ['activity-hub', 'invitations'],
		queryFn: async () => {
			const result = await getInvitations({ count: 50, offset: 0 });
			return result.invitations as ISubscription[];
		},
	});
}
