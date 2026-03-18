import type { ActivityItem, ActivityType } from '@rocket.chat/rest-typings';
import {
	Box,
	MessageDivider,
	Bubble,
	Icon,
	Tag,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference } from '@rocket.chat/ui-contexts';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';

type ActivityListProps = {
	activities: ActivityItem[];
	onEndReached?: () => void;
	onSelectActivity?: (activity: ActivityItem) => void;
	selectedActivityId?: string;
};

const activityTypeIcon: Record<ActivityType, string> = {
	mention: 'at',
	thread: 'thread',
	reaction: 'emoji',
	star: 'star',
	invitation: 'flag',
};

function isNewDay(a: ActivityItem, b: ActivityItem | undefined): boolean {
	if (!b) return true;
	const dateA = new Date(a.ts);
	const dateB = new Date(b.ts);
	return dateA.toDateString() !== dateB.toDateString();
}

type ActivityCardProps = {
	activity: ActivityItem;
	formatTime: (date: Date | string) => string;
	showUserAvatar: boolean;
	isSelected: boolean;
	onSelect: () => void;
};

const ActivityCard = ({ activity, formatTime, showUserAvatar, isSelected, onSelect }: ActivityCardProps) => {
	const { t } = useTranslation();

	const channel = activity.roomType !== 'd' ? `#${activity.roomName}` : activity.roomName;

	const descriptionLabel = (() => {
		const actor = activity.actor.name || activity.actor.username;
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
		<Box
			display='flex'
			flexDirection='column'
			paddingInline={16}
			paddingBlock={12}
			bg={isSelected ? 'surface-selected' : undefined}
			borderInlineStart={isSelected ? '2px solid' : '2px solid transparent'}
			borderColor={isSelected ? 'button-background-primary-default' : 'transparent'}
			style={{ cursor: activity.msgId ? 'pointer' : 'default' }}
			role='button'
			tabIndex={0}
			aria-pressed={isSelected}
			onClick={onSelect}
			onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onSelect();
				}
			}}
			className='activity-card'
		>
			{/* Description line + timestamp */}
			<Box display='flex' alignItems='center' justifyContent='space-between' mbe={8}>
				<Box display='flex' alignItems='center' style={{ gap: '6px' }} flexGrow={1} minWidth={0}>
					<Icon name={activityTypeIcon[activity.type] as any} size='x14' color='secondary-info' flexShrink={0} />
					<Box fontScale='c1' color='secondary-info' style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{descriptionLabel}
					</Box>
				</Box>
				<Box fontScale='c1' color='hint' flexShrink={0} mis={8}>
					{formatTime(activity.ts)}
				</Box>
			</Box>

			{/* Avatar + content */}
			<Box display='flex' alignItems='flex-start' style={{ gap: '8px' }}>
				{showUserAvatar && activity.actor.username && (
					<Box flexShrink={0}>
						<MessageAvatar username={activity.actor.username} size='x36' />
					</Box>
				)}
				<Box flexGrow={1} minWidth={0}>
					<Box display='flex' alignItems='baseline' style={{ gap: '4px' }} mbe={2}>
						<Box fontScale='p2m' color='default'>
							{activity.actor.name || activity.actor.username}
						</Box>
					</Box>
					{activity.msg && (
						<Box
							fontScale='p2'
							color='secondary-info'
							style={{
								overflow: 'hidden',
								display: '-webkit-box',
								WebkitLineClamp: 2,
								WebkitBoxOrient: 'vertical',
								wordBreak: 'break-word',
							}}
						>
							{activity.msg}
						</Box>
					)}
					{activity.unread && (
						<Box display='flex' alignItems='center' mbs={4} style={{ gap: '4px' }}>
							<Box width='x8' height='x8' borderRadius='full' bg='button-background-primary-default' flexShrink={0} />
							<Box fontScale='c2' color='hint'>
								{t('Unread')}
							</Box>
						</Box>
					)}
				</Box>
				<Box flexShrink={0}>
					<Tag variant='secondary' small>
						{activity.type}
					</Tag>
				</Box>
			</Box>
		</Box>
	);
};

const ActivityList = ({ activities, onEndReached, onSelectActivity, selectedActivityId }: ActivityListProps) => {
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
									activity={activity}
									formatTime={formatTime}
									showUserAvatar={showUserAvatar}
									isSelected={activity._id === selectedActivityId}
									onSelect={() => onSelectActivity?.(activity)}
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
