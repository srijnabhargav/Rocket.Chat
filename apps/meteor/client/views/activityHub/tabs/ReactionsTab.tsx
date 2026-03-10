import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import ActivityMessageList from '../components/ActivityMessageList';

type ReactionsTabProps = {
	roomType: 'all' | RoomType;
};

const ReactionsTab = ({ roomType }: ReactionsTabProps) => {
	const { t } = useTranslation();
	const getReactions = useEndpoint('GET', '/v1/activity-hub.reactions');

	const reactionsQuery = useQuery({
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

	if (reactionsQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (reactionsQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_reactions')}</StatesSubtitle>
			</States>
		);
	}

	const messages: IMessage[] = reactionsQuery.data ?? [];

	if (messages.length === 0) {
		return (
			<States>
				<StatesIcon name='emoji' />
				<StatesTitle>{t('No_reactions_found')}</StatesTitle>
			</States>
		);
	}

	return <ActivityMessageList messages={messages} />;
};

export default ReactionsTab;
