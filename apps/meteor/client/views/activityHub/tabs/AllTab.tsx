import type { RoomType } from '@rocket.chat/core-typings';
import type { ActivityItem } from '@rocket.chat/rest-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import ActivityList from '../components/ActivityList';
import { useActivityHubAll } from '../hooks/useActivityHubAll';

type AllTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
	onSelectActivity?: (activity: ActivityItem) => void;
	selectedActivityId?: string;
};

const AllTab = ({ roomType, unread, onSelectActivity, selectedActivityId }: AllTabProps) => {
	const { t } = useTranslation();
	const activitiesQuery = useActivityHubAll({ roomType, unread });

	if (activitiesQuery.isLoading) {
		return (
			<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
				<Throbber size='x12' />
			</Box>
		);
	}

	if (activitiesQuery.isError) {
		return (
			<States>
				<StatesIcon name='warning' />
				<StatesTitle>{t('Error')}</StatesTitle>
				<StatesSubtitle>{t('Error_loading_activities')}</StatesSubtitle>
			</States>
		);
	}

	const activities: ActivityItem[] = activitiesQuery.data?.activities ?? [];

	if (activities.length === 0) {
		return (
			<States>
				<StatesIcon name='bell' />
				<StatesTitle>{t('No_activities_found')}</StatesTitle>
			</States>
		);
	}

	return (
		<ActivityList
			activities={activities}
			onEndReached={() => {
				if (activitiesQuery.hasNextPage && !activitiesQuery.isFetchingNextPage) {
					void activitiesQuery.fetchNextPage();
				}
			}}
			onSelectActivity={onSelectActivity}
			selectedActivityId={selectedActivityId}
		/>
	);
};

export default AllTab;
