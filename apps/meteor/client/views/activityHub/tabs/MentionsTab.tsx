import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import ActivityMessageList from '../components/ActivityMessageList';

type MentionsTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const MentionsTab = ({ roomType, unread, onSelectMessage, selectedMessageId }: MentionsTabProps) => {
	const { t } = useTranslation();
	const getMentions = useEndpoint('GET', '/v1/activity-hub.mentions');

	const mentionsQuery = useQuery({
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

	if (mentionsQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (mentionsQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_mentions')}</StatesSubtitle>
			</States>
		);
	}

	const messages: IMessage[] = mentionsQuery.data ?? [];

	if (messages.length === 0) {
		return (
			<States>
				<StatesIcon name='magnifier' />
				<StatesTitle>{t('No_mentions_found')}</StatesTitle>
			</States>
		);
	}

	return (
		<ActivityMessageList
			messages={messages}
			activityType='mention'
			onSelectMessage={onSelectMessage}
			selectedMessageId={selectedMessageId}
		/>
	);
};

export default MentionsTab;
