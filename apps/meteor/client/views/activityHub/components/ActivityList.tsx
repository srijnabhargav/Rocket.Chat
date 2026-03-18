import type { ActivityItem } from '@rocket.chat/rest-typings';
import { Box, MessageDivider, Bubble } from '@rocket.chat/fuselage';
import { useUserPreference } from '@rocket.chat/ui-contexts';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import ActivityCard from './ActivityCard';

type ActivityListProps = {
	activities: ActivityItem[];
	onEndReached?: () => void;
	onSelectActivity?: (activity: ActivityItem) => void;
	selectedActivityId?: string;
};

function isNewDay(a: ActivityItem, b: ActivityItem | undefined): boolean {
	if (!b) return true;
	return new Date(a.ts).toDateString() !== new Date(b.ts).toDateString();
}

const ActivityList = ({ activities, onEndReached, onSelectActivity, selectedActivityId }: ActivityListProps) => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const formatTime = useFormatTime();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');

	return (
		<Box is='section' display='flex' flexDirection='column' flexGrow={1} flexShrink={1} flexBasis='auto' height='full'>
			<VirtualizedScrollbars>
				<Virtuoso
					totalCount={activities.length}
					overscan={25}
					data={activities}
					endReached={onEndReached}
					itemContent={(index, activity) => {
						const previous = activities[index - 1];
						const newDay = isNewDay(activity, previous);

						const channel = activity.roomType !== 'd' ? `#${activity.roomName}` : activity.roomName;
						const actor = activity.actor.name || activity.actor.username;

						const descriptionLabel = (() => {
							switch (activity.type) {
								case 'mention':
									return `${actor} ${t('mentioned_you_in')} ${channel}`;
								case 'thread':
									return `${t('Thread_in')} ${channel}`;
								case 'reaction':
									return `${actor} ${t('has_reacted_in')} ${channel}`;
								case 'star':
									return `${t('Starred_in')} ${channel}`;
								case 'invitation':
									return `${actor} ${t('Added_you_to')} ${channel}`;
								default:
									return `${actor} ${t('in')} ${channel}`;
							}
						})();

						return (
							<Box key={activity._id}>
								{newDay && (
									<MessageDivider>
										<Bubble small secondary>
											{formatDate(activity.ts)}
										</Bubble>
									</MessageDivider>
								)}
								<ActivityCard
									type={activity.type}
									descriptionLabel={descriptionLabel}
									timestamp={formatTime(activity.ts)}
									username={activity.actor.username}
									displayName={activity.actor.name || activity.actor.username}
									messagePreview={activity.msg}
									showUserAvatar={showUserAvatar}
									isSelected={activity._id === selectedActivityId}
									onSelect={() => onSelectActivity?.(activity)}
									showTypeTag
								/>
							</Box>
						);
					}}
				/>
			</VirtualizedScrollbars>
		</Box>
	);
};

export default ActivityList;
