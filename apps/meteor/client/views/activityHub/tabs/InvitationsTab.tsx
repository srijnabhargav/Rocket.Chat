import type { ISubscription } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import InvitationItem from '../components/InvitationItem';
import { useActivityHubInvitations } from '../hooks/useActivityHubInvitations';

const InvitationsTab = () => {
	const { t } = useTranslation();
	const invitationsQuery = useActivityHubInvitations();

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

	const invitations: ISubscription[] = invitationsQuery.data?.invitations ?? [];

	if (invitations.length === 0) {
		return (
			<States>
				<StatesIcon name='flag' />
				<StatesTitle>{t('No_invitations_found')}</StatesTitle>
			</States>
		);
	}

	return (
		<Box is='section' display='flex' flexDirection='column' flexGrow={1} flexShrink={1} flexBasis='auto' height='full'>
			<VirtualizedScrollbars>
				<Virtuoso
					totalCount={invitations.length}
					overscan={25}
					data={invitations}
					endReached={() => {
						if (invitationsQuery.hasNextPage && !invitationsQuery.isFetchingNextPage) {
							void invitationsQuery.fetchNextPage();
						}
					}}
					itemContent={(_index, inv) => <InvitationItem key={inv._id} subscription={inv} />}
				/>
			</VirtualizedScrollbars>
		</Box>
	);
};

export default InvitationsTab;
