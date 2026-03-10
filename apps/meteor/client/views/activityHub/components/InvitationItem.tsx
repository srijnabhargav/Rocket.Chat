import type { ISubscription } from '@rocket.chat/core-typings';
import {
	Box,
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader as FuselageMessageHeader,
	MessageName,
	MessageTimestamp,
	Tag,
	ButtonGroup,
	Button,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFormatDate } from '../../../hooks/useFormatDate';

type InvitationItemProps = {
	subscription: ISubscription;
};

const InvitationItem = ({ subscription }: InvitationItemProps) => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const queryClient = useQueryClient();
	const replyInvite = useEndpoint('POST', '/v1/rooms.invite');

	const invalidateInvitations = () => queryClient.invalidateQueries({ queryKey: ['activity-hub', 'invitations'] });

	const acceptMutation = useMutation({
		mutationFn: () => replyInvite({ roomId: subscription.rid, action: 'accept' }),
		onSuccess: invalidateInvitations,
	});

	const rejectMutation = useMutation({
		mutationFn: () => replyInvite({ roomId: subscription.rid, action: 'reject' }),
		onSuccess: invalidateInvitations,
	});

	const inviter = subscription.inviter;
	const roomName = subscription.fname || subscription.name;
	const roomType = subscription.t;

	return (
		<Message>
			<MessageLeftContainer>
				{inviter?.username && <MessageAvatar username={inviter.username} size='x36' />}
			</MessageLeftContainer>
			<MessageContainer>
				<FuselageMessageHeader>
					<MessageName>{inviter?.name || inviter?.username || t('Unknown')}</MessageName>
					<MessageTimestamp title={formatDate(subscription.ts)}>{formatDate(subscription.ts)}</MessageTimestamp>
					{roomName && (
						<Tag variant='secondary' small>
							{roomType === 'd' ? '' : '#'}
							{roomName}
						</Tag>
					)}
				</FuselageMessageHeader>
				<Box mbs={4} color='secondary-info'>
					{t('Invited_you_to_join_channel', { channel: roomName || subscription.rid })}
				</Box>
				<ButtonGroup mbs={8}>
					<Button
						small
						primary
						onClick={() => acceptMutation.mutate()}
						disabled={acceptMutation.isPending || rejectMutation.isPending}
					>
						{t('Accept')}
					</Button>
					<Button
						small
						danger
						onClick={() => rejectMutation.mutate()}
						disabled={acceptMutation.isPending || rejectMutation.isPending}
					>
						{t('Decline')}
					</Button>
				</ButtonGroup>
			</MessageContainer>
		</Message>
	);
};

export default InvitationItem;
