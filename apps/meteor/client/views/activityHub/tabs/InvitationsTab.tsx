import type { ISubscription } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import InvitationItem from '../components/InvitationItem';

const InvitationsTab = () => {
	const { t } = useTranslation();
	const getInvitations = useEndpoint('GET', '/v1/activity-hub.invitations');

	const invitationsQuery = useQuery({
		queryKey: ['activity-hub', 'invitations'],
		queryFn: async () => {
			const result = await getInvitations({ count: 50, offset: 0 });
			return result.invitations as ISubscription[];
		},
	});

	if (invitationsQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (invitationsQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_invitations')}</StatesSubtitle>
			</States>
		);
	}

	const invitations: ISubscription[] = invitationsQuery.data ?? [];

	if (invitations.length === 0) {
		return (
			<States>
				<StatesIcon name='flag' />
				<StatesTitle>{t('No_invitations_found')}</StatesTitle>
			</States>
		);
	}

	return (
		<Box display='flex' flexDirection='column' flexGrow={1} overflow='auto'>
			{invitations.map((inv) => (
				<InvitationItem key={inv._id} subscription={inv} />
			))}
		</Box>
	);
};

export default InvitationsTab;
