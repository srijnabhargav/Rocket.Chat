import type { RoomType } from '@rocket.chat/core-typings';
import type { ActivityItem } from '@rocket.chat/rest-typings';
import { States, StatesIcon, StatesTitle, StatesSubtitle, Box, Throbber } from '@rocket.chat/fuselage';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import ActivityList from '../components/ActivityList';

type AllTabProps = {
	roomType: 'all' | RoomType;
	unread: boolean;
};

const PAGE_SIZE = 50;

const AllTab = ({ roomType, unread }: AllTabProps) => {
	const { t } = useTranslation();
	const getActivities = useEndpoint('GET', '/v1/activity-hub.activities');

	const activitiesQuery = useInfiniteQuery({
		queryKey: ['activity-hub', 'all', roomType, unread],
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const params: { count: number; offset: number; roomType?: RoomType; unread?: boolean } = {
				count: PAGE_SIZE,
				offset: pageParam,
			};
			if (roomType !== 'all') {
				params.roomType = roomType;
			}
			if (unread) {
				params.unread = true;
			}
			return getActivities(params);
		},
		getNextPageParam: (lastPage) => {
			const nextOffset = lastPage.offset + lastPage.count;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
	});

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

	const activities: ActivityItem[] = activitiesQuery.data?.pages.flatMap((page) => page.activities) ?? [];

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
		/>
	);
};

export default AllTab;
