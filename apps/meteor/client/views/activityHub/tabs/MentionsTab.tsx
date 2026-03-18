import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import ActivityMessageList from '../components/ActivityMessageList';
import { useActivityHubMentions } from '../hooks/useActivityHubMentions';

type MentionsTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const MentionsTab = ({ roomType, unread, onSelectMessage, selectedMessageId }: MentionsTabProps) => {
	const { t } = useTranslation();
	const mentionsQuery = useActivityHubMentions({ roomType, unread });

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
