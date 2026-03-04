import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import ActivityMessageList from '../components/ActivityMessageList';

type StarredMessagesTabProps = {
	roomType: 'all' | RoomType;
};

const StarredMessagesTab = ({ roomType }: StarredMessagesTabProps) => {
	const { t } = useTranslation();
	const getStarredMessages = useEndpoint('GET', '/v1/activity-hub.starred-messages');

	const starredQuery = useQuery({
		queryKey: ['activity-hub', 'starred-messages', roomType],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType } = { count: 100, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			const result = await getStarredMessages(params);
			return result.messages.map(mapMessageFromApi);
		},
	});

	if (starredQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (starredQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_starred')}</StatesSubtitle>
			</States>
		);
	}

	const messages: IMessage[] = starredQuery.data ?? [];

	if (messages.length === 0) {
		return (
			<States>
				<StatesIcon name='magnifier' />
				<StatesTitle>{t('No_starred_messages')}</StatesTitle>
			</States>
		);
	}

	return <ActivityMessageList messages={messages} />;
};

export default StarredMessagesTab;

