import type { ActivityItem, ActivityType } from '@rocket.chat/rest-typings';
import {
	Box,
	MessageDivider,
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader as FuselageMessageHeader,
	MessageName,
	MessageTimestamp,
	MessageBody,
	Tag,
	Bubble,
	Icon,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference } from '@rocket.chat/ui-contexts';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import { useGoToRoom } from '../../room/hooks/useGoToRoom';

type ActivityListProps = {
	activities: ActivityItem[];
	onEndReached?: () => void;
};

const activityTypeLabel: Record<ActivityType, string> = {
	mention: 'Mentions',
	thread: 'Threads',
	reaction: 'Reactions',
	star: 'Starred_Messages',
	invitation: 'Invitation',
};

const activityTypeIcon: Record<ActivityType, string> = {
	mention: 'at',
	thread: 'thread',
	reaction: 'emoji',
	star: 'star',
	invitation: 'flag',
};

const activityTypeColor: Record<ActivityType, 'default' | 'primary' | 'warning' | 'danger' | 'success'> = {
	mention: 'primary',
	thread: 'default',
	reaction: 'warning',
	star: 'warning',
	invitation: 'success',
};

function isNewDay(a: ActivityItem, b: ActivityItem | undefined): boolean {
	if (!b) return true;
	const dateA = new Date(a.ts);
	const dateB = new Date(b.ts);
	return dateA.toDateString() !== dateB.toDateString();
}

const ActivityList = ({ activities, onEndReached }: ActivityListProps) => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const formatTime = useFormatTime();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');
	const goToRoom = useGoToRoom();

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

						return (
							<Box key={activity._id}>
								{newDay && (
									<MessageDivider>
										<Bubble small secondary>
											{formatDate(activity.ts)}
										</Bubble>
									</MessageDivider>
								)}
								<Message
									onClick={() => activity.msgId && goToRoom(activity.rid)}
									style={{ cursor: activity.msgId ? 'pointer' : 'default' }}
								>
									<MessageLeftContainer>
										{showUserAvatar && activity.actor.username && (
											<MessageAvatar username={activity.actor.username} size='x36' />
										)}
									</MessageLeftContainer>
									<MessageContainer>
										<FuselageMessageHeader>
											<MessageName>{activity.actor.name || activity.actor.username}</MessageName>
											<MessageTimestamp title={formatTime(activity.ts)}>
												{formatTime(activity.ts)}
											</MessageTimestamp>
											<Tag variant={activityTypeColor[activity.type]} small>
												<Icon name={activityTypeIcon[activity.type] as any} size='x12' mie={2} />
												{t(activityTypeLabel[activity.type])}
											</Tag>
											<Tag variant='secondary' small>
												{activity.roomType !== 'd' ? '#' : ''}
												{activity.roomName}
											</Tag>
										</FuselageMessageHeader>
										{activity.msg && <MessageBody>{activity.msg}</MessageBody>}
										{activity.unread && (
											<Box is='span' width='x8' height='x8' borderRadius='full' bg='status-font-on-success' mis={4} />
										)}
									</MessageContainer>
								</Message>
							</Box>
						);
					}}
				/>
			</VirtualizedScrollbars>
		</Box>
	);
};

export default ActivityList;
