import type { IMessage } from '@rocket.chat/core-typings';
import { Box, MessageDivider, Bubble, Icon, Tag } from '@rocket.chat/fuselage';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference, useUserSubscription } from '@rocket.chat/ui-contexts';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import { isMessageNewDay } from '../../room/MessageList/lib/isMessageNewDay';
import ActivityCard from './ActivityCard';
import type { ActivityCardType } from './ActivityCard';

export type ActivityMessageType = 'mention' | 'thread' | 'reaction' | 'star' | 'invitation' | 'all';

type ActivityMessageListProps = {
	messages: IMessage[];
	activityType?: ActivityMessageType;
	onSelectMessage?: (message: IMessage) => void;
	selectedMessageId?: string;
	onEndReached?: () => void;
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
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(true);
	const subscription = useUserSubscription(group.rid);
	const roomName = subscription?.fname || subscription?.name || group.rid;
	const firstMessage = group.messages[0];
	const count = group.messages.length;
	const newDay = isMessageNewDay(firstMessage, previousGroupLastMessage);

	const buildDescription = (message: IMessage) => {
		const actor = message.u.name || message.u.username;
		const channel = `#${roomName}`;
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
				return `${actor} ${channel ? `${t('in')} ${channel}` : ''}`;
		}
	};

	const renderReactionFooter = (message: IMessage) => {
		if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
		return (
			<Box display='flex' flexWrap='wrap' mbs={6} rcx-box--animated gap={4}>
				{Object.entries(message.reactions).map(([emoji, data]) => (
					<Tag key={emoji} variant='secondary' small>
						{emoji} {data.usernames.length}
					</Tag>
				))}
			</Box>
		);
	};

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
					type={activityType as ActivityCardType}
					descriptionLabel={buildDescription(firstMessage)}
					timestamp={formatTime(firstMessage.ts)}
					username={firstMessage.u.username}
					displayName={firstMessage.u.name || firstMessage.u.username}
					messagePreview={firstMessage.msg}
					showUserAvatar={showUserAvatar}
					isSelected={firstMessage._id === selectedMessageId}
					onSelect={() => onSelectMessage?.(firstMessage)}
					footer={renderReactionFooter(firstMessage)}
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
			<Box
				display='flex'
				alignItems='center'
				paddingInline={16}
				paddingBlock={8}
				bg='surface-tint'
				rcx-box--animated
				gap={8}
				style={{ cursor: 'pointer' }}
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
					{count} {count === 1 ? t('activity') : t('activities')}
				</Box>
				<Icon name={expanded ? 'chevron-up' : 'chevron-down'} size='x16' color='hint' />
			</Box>
			{expanded &&
				group.messages.map((message) => (
					<Box key={message._id} pis={8}>
						<ActivityCard
							type={activityType as ActivityCardType}
							descriptionLabel={buildDescription(message)}
							timestamp={formatTime(message.ts)}
							username={message.u.username}
							displayName={message.u.name || message.u.username}
							messagePreview={message.msg}
							showUserAvatar={showUserAvatar}
							isSelected={message._id === selectedMessageId}
							onSelect={() => onSelectMessage?.(message)}
							footer={renderReactionFooter(message)}
						/>
					</Box>
				))}
		</Box>
	);
};

const ActivityMessageList = ({
	messages,
	activityType = 'all',
	onSelectMessage,
	selectedMessageId,
	onEndReached,
}: ActivityMessageListProps) => {
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
					endReached={onEndReached}
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
