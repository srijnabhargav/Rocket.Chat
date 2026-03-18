import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import ActivityMessageList from '../components/ActivityMessageList';
import { useActivityHubThreads } from '../hooks/useActivityHubThreads';

type ThreadsTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const ThreadsTab = ({ roomType, unread, onSelectMessage, selectedMessageId }: ThreadsTabProps) => {
	const { t } = useTranslation();
	const threadsQuery = useActivityHubThreads({ roomType, unread });

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

	const messages: IMessage[] = threadsQuery.data?.messages ?? [];

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
			onEndReached={() => {
				if (threadsQuery.hasNextPage && !threadsQuery.isFetchingNextPage) {
					void threadsQuery.fetchNextPage();
				}
			}}
		/>
	);
};

export default ThreadsTab;
