import type { IMessage } from '@rocket.chat/core-typings';
import {
	Box,
	MessageDivider,
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader as FuselageMessageHeader,
	MessageName,
	MessageTimestamp,
	MessageUsername,
	MessageBody,
	Tag,
	Bubble,
	Icon,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference, useUserSubscription } from '@rocket.chat/ui-contexts';
import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import { legacyJumpToMessage } from '../../../lib/utils/legacyJumpToMessage';
import { isMessageNewDay } from '../../room/MessageList/lib/isMessageNewDay';

type ActivityMessageListProps = {
	messages: IMessage[];
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

type SingleMessageRowProps = {
	message: IMessage;
	previous?: IMessage;
	showUserAvatar: boolean;
	formatDate: (date: Date | string) => string;
	formatTime: (date: Date | string) => string;
};

const SingleMessageRow = ({ message, previous, showUserAvatar, formatDate, formatTime }: SingleMessageRowProps) => {
	const subscription = useUserSubscription(message.rid);
	const roomName = subscription?.fname || subscription?.name || message.rid;
	const newDay = isMessageNewDay(message, previous);

	const handleClick = () => {
		void legacyJumpToMessage(message);
	};

	return (
		<Box>
			{newDay && (
				<MessageDivider>
					<Bubble small secondary>
						{formatDate(message.ts)}
					</Bubble>
				</MessageDivider>
			)}
			<Message onClick={handleClick} style={{ cursor: 'pointer' }}>
				<MessageLeftContainer>
					{showUserAvatar && message.u.username && <MessageAvatar username={message.u.username} size='x36' />}
				</MessageLeftContainer>
				<MessageContainer>
					<FuselageMessageHeader>
						<MessageName data-username={message.u.username}>{message.u.name || message.u.username}</MessageName>
						<MessageUsername data-username={message.u.username}>@{message.u.username}</MessageUsername>
						<MessageTimestamp title={formatTime(message.ts)}>{formatTime(message.ts)}</MessageTimestamp>
						{roomName && (
							<Tag variant='secondary' small>
								#{roomName}
							</Tag>
						)}
					</FuselageMessageHeader>
					<MessageBody>{message.msg}</MessageBody>
				</MessageContainer>
			</Message>
		</Box>
	);
};

type GroupedRoomRowProps = {
	group: MessageGroup;
	showUserAvatar: boolean;
	formatDate: (date: Date | string) => string;
	formatTime: (date: Date | string) => string;
	previousGroupLastMessage?: IMessage;
};

const GroupedRoomRow = ({ group, showUserAvatar, formatDate, formatTime, previousGroupLastMessage }: GroupedRoomRowProps) => {
	const [expanded, setExpanded] = useState(false);
	const subscription = useUserSubscription(group.rid);
	const roomName = subscription?.fname || subscription?.name || group.rid;
	const firstMessage = group.messages[0];
	const count = group.messages.length;
	const newDay = isMessageNewDay(firstMessage, previousGroupLastMessage);

	if (count === 1) {
		return (
			<SingleMessageRow
				message={firstMessage}
				previous={previousGroupLastMessage}
				showUserAvatar={showUserAvatar}
				formatDate={formatDate}
				formatTime={formatTime}
			/>
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
				borderRadius='x4'
				mis={8}
				mie={8}
				style={{ cursor: 'pointer' }}
				onClick={() => setExpanded((v) => !v)}
			>
				<Tag variant='primary' small mis={0}>
					#{roomName}
				</Tag>
				<Box fontScale='p2m' color='default' mis={8} flexGrow={1}>
					{count} {count === 1 ? 'activity' : 'activities'}
				</Box>
				<Icon name={expanded ? 'chevron-up' : 'chevron-down'} size='x20' />
			</Box>
			{expanded && (
				<Box mis={16}>
					{group.messages.map((message, idx) => (
						<SingleMessageRow
							key={message._id}
							message={message}
							previous={idx > 0 ? group.messages[idx - 1] : undefined}
							showUserAvatar={showUserAvatar}
							formatDate={formatDate}
							formatTime={formatTime}
						/>
					))}
				</Box>
			)}
		</Box>
	);
};

const ActivityMessageList = ({ messages }: ActivityMessageListProps) => {
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
							<GroupedRoomRow
								key={group.rid}
								group={group}
								showUserAvatar={showUserAvatar}
								formatDate={formatDate}
								formatTime={formatTime}
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
