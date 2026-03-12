import type { IMessage } from '@rocket.chat/core-typings';
import {
	Box,
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader as FuselageMessageHeader,
	MessageName,
	MessageUsername,
	MessageTimestamp,
	MessageBody,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { useUserPreference } from '@rocket.chat/ui-contexts';

import { useFormatTime } from '../../../hooks/useFormatTime';

type PreviewMessageCardProps = {
	message: IMessage;
	isHighlighted?: boolean;
};

const PreviewMessageCard = ({ message, isHighlighted }: PreviewMessageCardProps) => {
	const formatTime = useFormatTime();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');

	return (
		<Box
			bg={isHighlighted ? 'surface-hover' : undefined}
			borderInlineStart={isHighlighted ? '2px solid' : undefined}
			borderColor={isHighlighted ? 'status-font-on-info' : undefined}
		>
			<Message>
				<MessageLeftContainer>
					{showUserAvatar && message.u.username && (
						<MessageAvatar username={message.u.username} size='x36' />
					)}
				</MessageLeftContainer>
				<MessageContainer>
					<FuselageMessageHeader>
						<MessageName>{message.u.name || message.u.username}</MessageName>
						<MessageUsername>@{message.u.username}</MessageUsername>
						<MessageTimestamp>{formatTime(message.ts)}</MessageTimestamp>
					</FuselageMessageHeader>
					{message.msg && <MessageBody>{message.msg}</MessageBody>}
				</MessageContainer>
			</Message>
		</Box>
	);
};

export default PreviewMessageCard;
