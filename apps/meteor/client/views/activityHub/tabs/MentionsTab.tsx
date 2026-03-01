import type { IMessage } from '@rocket.chat/core-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import ActivityMessageList from '../components/ActivityMessageList';

const MentionsTab = () => {
	const { t } = useTranslation();
	const getMentions = useEndpoint('GET', '/v1/activity-hub.mentions');

	const mentionsQuery = useQuery({
		queryKey: ['activity-hub', 'mentions'],
		queryFn: async () => {
			const result = await getMentions({ count: 100, offset: 0 });
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

	return <ActivityMessageList messages={messages} />;
};

export default MentionsTab;

