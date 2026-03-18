import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import ActivityMessageList from '../components/ActivityMessageList';
import { useActivityHubReactions } from '../hooks/useActivityHubReactions';

type ReactionsTabProps = {
	roomType: 'all' | RoomType;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

const ReactionsTab = ({ roomType, onSelectMessage, selectedMessageId }: ReactionsTabProps) => {
	const { t } = useTranslation();
	const reactionsQuery = useActivityHubReactions({ roomType });

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

	return (
		<ActivityMessageList
			messages={messages}
			activityType='reaction'
			onSelectMessage={onSelectMessage}
			selectedMessageId={selectedMessageId}
		/>
	);
};

export default ReactionsTab;
