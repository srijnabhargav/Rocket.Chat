import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import ActivityMessageList from '../components/ActivityMessageList';
import { useActivityHubStarred } from '../hooks/useActivityHubStarred';

type StarredMessagesTabProps = {
	roomType: 'all' | RoomType;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const StarredMessagesTab = ({ roomType, onSelectMessage, selectedMessageId }: StarredMessagesTabProps) => {
	const { t } = useTranslation();
	const starredQuery = useActivityHubStarred({ roomType });

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

	return (
		<ActivityMessageList
			messages={messages}
			activityType='star'
			onSelectMessage={onSelectMessage}
			selectedMessageId={selectedMessageId}
		/>
	);
};

export default StarredMessagesTab;
