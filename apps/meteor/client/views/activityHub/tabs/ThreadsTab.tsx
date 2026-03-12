import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import ActivityMessageList from '../components/ActivityMessageList';

type ThreadsTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const ThreadsTab = ({ roomType, unread, onSelectMessage, selectedMessageId }: ThreadsTabProps) => {
	const { t } = useTranslation();
	const getThreads = useEndpoint('GET', '/v1/activity-hub.threads');

	const threadsQuery = useQuery({
		queryKey: ['activity-hub', 'threads', roomType, unread],
		queryFn: async () => {
			const params: { count: number; offset: number; roomType?: RoomType; unread?: boolean } = { count: 50, offset: 0 };
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			if (unread) {
				params.unread = true;
			}
			const result = await getThreads(params);
			return result.messages.map(mapMessageFromApi);
		},
	});

	if (threadsQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (threadsQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_threads')}</StatesSubtitle>
			</States>
		);
	}

	const messages: IMessage[] = threadsQuery.data ?? [];

	if (messages.length === 0) {
		return (
			<States>
				<StatesIcon name='thread' />
				<StatesTitle>{t('No_threads_found')}</StatesTitle>
			</States>
		);
	}

	return (
		<ActivityMessageList
			messages={messages}
			activityType='thread'
			onSelectMessage={onSelectMessage}
			selectedMessageId={selectedMessageId}
		/>
	);
};

export default ThreadsTab;
