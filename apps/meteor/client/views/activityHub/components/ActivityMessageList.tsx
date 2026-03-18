import type { IMessage } from '@rocket.chat/core-typings';
import {
	Box,
	MessageDivider,
	Bubble,
	Icon,
	Tag,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference, useUserSubscription } from '@rocket.chat/ui-contexts';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import { isMessageNewDay } from '../../room/MessageList/lib/isMessageNewDay';

export type ActivityMessageType = 'mention' | 'thread' | 'reaction' | 'star' | 'invitation' | 'all';

type ActivityMessageListProps = {
	messages: IMessage[];
	activityType?: ActivityMessageType;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
};

type MessageGroup = {
	rid: string;
	messages: IMessage[];
};

function groupByRoom(messages: IMessage[]): MessageGroup[] {
	const groups: MessageGroup[] = [];
	const seen = new Map<string, MessageGroup>();
	for (const message of messages) {
		const existing = seen.get(message.rid);
		if (existing) {
			existing.messages.push(message);
		} else {
			const group: MessageGroup = { rid: message.rid, messages: [message] };
			groups.push(group);
			seen.set(message.rid, group);
		}
	}
	return groups;
}

const activityTypeIcon: Record<ActivityMessageType, string> = {
	mention: 'at',
	thread: 'thread',
	reaction: 'emoji',
	star: 'star',
	invitation: 'flag',
	all: 'bell',
};

type ActivityCardProps = {
	message: IMessage;
	activityType: ActivityMessageType;
	roomName: string;
	showUserAvatar: boolean;
	formatTime: (date: Date | string) => string;
	isSelected: boolean;
	onSelect: () => void;
};

const ActivityCard = ({
	message,
	activityType,
	roomName,
	showUserAvatar,
	formatTime,
	isSelected,
	onSelect,
}: ActivityCardProps) => {
	const { t } = useTranslation();

	const descriptionLabel = (() => {
		const actor = message.u.name || message.u.username;
		const channel = roomName ? `#${roomName}` : '';
		switch (activityType) {
			case 'mention':
				return `${actor} ${t('mentioned_you_in')} ${channel}`;
			case 'thread':
				return `${t('Thread_in')} ${channel}`;
			case 'reaction':
				return `${actor} ${t('has_reacted_in')} ${channel}`;
			case 'star':
				return `${t('Starred_in')} ${channel}`;
			default:
				return `${actor} ${channel ? `in ${channel}` : ''}`;
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
			style={{ cursor: 'pointer' }}
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
			{/* Description line: icon + actor description + timestamp */}
			<Box display='flex' alignItems='center' justifyContent='space-between' mbe={8}>
				<Box display='flex' alignItems='center' style={{ gap: '6px' }} flexGrow={1} minWidth={0}>
					<Icon name={activityTypeIcon[activityType] as any} size='x14' color='secondary-info' flexShrink={0} />
					<Box fontScale='c1' color='secondary-info' style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{descriptionLabel}
					</Box>
				</Box>
				<Box fontScale='c1' color='hint' flexShrink={0} mis={8}>
					{formatTime(message.ts)}
				</Box>
			</Box>

			{/* Message row: avatar + name + preview */}
			<Box display='flex' alignItems='flex-start' style={{ gap: '8px' }}>
				{showUserAvatar && message.u.username && (
					<Box flexShrink={0}>
						<MessageAvatar username={message.u.username} size='x36' />
					</Box>
				)}
				<Box flexGrow={1} minWidth={0}>
					<Box display='flex' alignItems='baseline' style={{ gap: '4px' }} mbe={2}>
						<Box fontScale='p2m' color='default'>
							{message.u.name || message.u.username}
						</Box>
						<Box fontScale='c1' color='hint'>
							@{message.u.username}
						</Box>
					</Box>
					{message.msg && (
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
							{message.msg}
						</Box>
					)}
					{/* Reaction badges if present */}
					{message.reactions && Object.keys(message.reactions).length > 0 && (
						<Box display='flex' flexWrap='wrap' mbs={6} style={{ gap: '4px' }}>
							{Object.entries(message.reactions).map(([emoji, data]) => (
								<Tag key={emoji} variant='secondary' small>
									{emoji} {data.usernames.length}
								</Tag>
							))}
						</Box>
					)}
				</Box>
			</Box>
		</Box>
	);
};

type GroupRowProps = {
	group: MessageGroup;
	activityType: ActivityMessageType;
	showUserAvatar: boolean;
	formatDate: (date: Date | string) => string;
	formatTime: (date: Date | string) => string;
	selectedMessageId?: string;
	onSelectMessage?: (message: IMessage) => void;
	previousGroupLastMessage?: IMessage;
};

const GroupRow = ({
	group,
	activityType,
	showUserAvatar,
	formatDate,
	formatTime,
	selectedMessageId,
	onSelectMessage,
	previousGroupLastMessage,
}: GroupRowProps) => {
	const [expanded, setExpanded] = useState(true);
	const subscription = useUserSubscription(group.rid);
	const roomName = subscription?.fname || subscription?.name || group.rid;
	const firstMessage = group.messages[0];
	const count = group.messages.length;
	const newDay = isMessageNewDay(firstMessage, previousGroupLastMessage);

	if (count === 1) {
		return (
			<Box>
				{newDay && (
					<MessageDivider>
						<Bubble small secondary>
							{formatDate(firstMessage.ts)}
						</Bubble>
					</MessageDivider>
				)}
				<ActivityCard
					message={firstMessage}
					activityType={activityType}
					roomName={roomName}
					showUserAvatar={showUserAvatar}
					formatTime={formatTime}
					isSelected={firstMessage._id === selectedMessageId}
					onSelect={() => onSelectMessage?.(firstMessage)}
				/>
			</Box>
		);
	}

	return (
		<Box>
			{newDay && (
				<MessageDivider>
					<Bubble small secondary>
						{formatDate(firstMessage.ts)}
					</Bubble>
				</MessageDivider>
			)}
		{/* Group header */}
		<Box
			display='flex'
			alignItems='center'
			paddingInline={16}
			paddingBlock={8}
			bg='surface-tint'
			style={{ cursor: 'pointer', gap: '8px' }}
			role='button'
			tabIndex={0}
			aria-expanded={expanded}
			onClick={() => setExpanded((v) => !v)}
			onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					setExpanded((v) => !v);
				}
			}}
		>
				<Icon name='hashtag' size='x14' color='secondary-info' />
				<Box fontScale='p2m' color='default' flexGrow={1}>
					{roomName}
				</Box>
				<Box fontScale='c1' color='hint'>
					{count} {count === 1 ? 'activity' : 'activities'}
				</Box>
				<Icon name={expanded ? 'chevron-up' : 'chevron-down'} size='x16' color='hint' />
			</Box>
			{expanded &&
				group.messages.map((message) => (
					<Box key={message._id} pis={8}>
						<ActivityCard
							message={message}
							activityType={activityType}
							roomName={roomName}
							showUserAvatar={showUserAvatar}
							formatTime={formatTime}
							isSelected={message._id === selectedMessageId}
							onSelect={() => onSelectMessage?.(message)}
						/>
					</Box>
				))}
		</Box>
	);
};

const ActivityMessageList = ({ messages, activityType = 'all', onSelectMessage, selectedMessageId }: ActivityMessageListProps) => {
	const formatDate = useFormatDate();
	const formatTime = useFormatTime();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');

	const groups = groupByRoom(messages);

	return (
		<Box is='section' display='flex' flexDirection='column' flexGrow={1} flexShrink={1} flexBasis='auto' height='full'>
			<VirtualizedScrollbars>
				<Virtuoso
					totalCount={groups.length}
					overscan={25}
					data={groups}
					itemContent={(index, group) => {
						const previousGroup = groups[index - 1];
						const previousGroupLastMessage = previousGroup?.messages[previousGroup.messages.length - 1];
						return (
							<GroupRow
								key={group.rid + index}
								group={group}
								activityType={activityType}
								showUserAvatar={showUserAvatar}
								formatDate={formatDate}
								formatTime={formatTime}
								selectedMessageId={selectedMessageId}
								onSelectMessage={onSelectMessage}
								previousGroupLastMessage={previousGroupLastMessage}
							/>
						);
					}}
				/>
			</VirtualizedScrollbars>
		</Box>
	);
};

export default ActivityMessageList;
