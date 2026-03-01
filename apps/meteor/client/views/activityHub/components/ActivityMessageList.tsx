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
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useUserPreference } from '@rocket.chat/ui-contexts';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { useFormatTime } from '../../../hooks/useFormatTime';
import { useGoToRoom } from '../../room/hooks/useGoToRoom';
import { isMessageNewDay } from '../../room/MessageList/lib/isMessageNewDay';

type ActivityMessageListProps = {
	messages: IMessage[];
};

const ActivityMessageList = ({ messages }: ActivityMessageListProps) => {
	const formatDate = useFormatDate();
	const formatTime = useFormatTime();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');
	const goToRoom = useGoToRoom();

	return (
		<Box is='section' display='flex' flexDirection='column' flexGrow={1} flexShrink={1} flexBasis='auto' height='full'>
			<VirtualizedScrollbars>
				<Virtuoso
					totalCount={messages.length}
					overscan={25}
					data={messages}
					itemContent={(index, message) => {
						const previous = messages[index - 1];
						const newDay = isMessageNewDay(message, previous);

						return (
							<Box key={message._id}>
								{newDay && (
									<MessageDivider>
										<Bubble small secondary>
											{formatDate(message.ts)}
										</Bubble>
									</MessageDivider>
								)}
								<Message
									onClick={() => goToRoom(message.rid)}
									style={{ cursor: 'pointer' }}
								>
									<MessageLeftContainer>
										{showUserAvatar && message.u.username && (
											<MessageAvatar username={message.u.username} size='x36' />
										)}
									</MessageLeftContainer>
									<MessageContainer>
										<FuselageMessageHeader>
											<MessageName data-username={message.u.username}>
												{message.u.name || message.u.username}
											</MessageName>
											<MessageUsername data-username={message.u.username}>
												@{message.u.username}
											</MessageUsername>
											<MessageTimestamp title={formatTime(message.ts)}>
												{formatTime(message.ts)}
											</MessageTimestamp>
											<Tag variant='secondary' small>
												{message.rid}
											</Tag>
										</FuselageMessageHeader>
										<MessageBody>
											{message.msg}
										</MessageBody>
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

export default ActivityMessageList;

