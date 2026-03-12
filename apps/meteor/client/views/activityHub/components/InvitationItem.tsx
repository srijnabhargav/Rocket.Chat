import type { ISubscription } from '@rocket.chat/core-typings';
import {
	Box,
	Icon,
	Button,
	ButtonGroup,
} from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useFormatTime } from '../../../hooks/useFormatTime';

type InvitationItemProps = {
	subscription: ISubscription;
};

const InvitationItem = ({ subscription }: InvitationItemProps) => {
	const { t } = useTranslation();
	const formatTime = useFormatTime();
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
	const channel = roomType !== 'd' ? `#${roomName}` : roomName;

	return (
		<Box
			display='flex'
			flexDirection='column'
			paddingInline={16}
			paddingBlock={12}
			borderInlineStart='2px solid transparent'
			className='activity-card'
		>
			{/* Description line + timestamp */}
			<Box display='flex' alignItems='center' justifyContent='space-between' mbe={8}>
				<Box display='flex' alignItems='center' style={{ gap: '6px' }} flexGrow={1} minWidth={0}>
					<Icon name='flag' size='x14' color='secondary-info' flexShrink={0} />
					<Box fontScale='c1' color='secondary-info' style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{inviter?.name || inviter?.username || t('Unknown')} {t('Added_you_to')} {channel}
					</Box>
				</Box>
				<Box fontScale='c1' color='hint' flexShrink={0} mis={8}>
					{formatTime(subscription.ts)}
				</Box>
			</Box>

			{/* Avatar + content + actions */}
			<Box display='flex' alignItems='flex-start' style={{ gap: '8px' }}>
				{inviter?.username && (
					<Box flexShrink={0}>
						<MessageAvatar username={inviter.username} size='x36' />
					</Box>
				)}
				<Box flexGrow={1} minWidth={0}>
					<Box display='flex' alignItems='baseline' style={{ gap: '4px' }} mbe={2}>
						<Box fontScale='p2m' color='default'>
							{inviter?.name || inviter?.username || t('Unknown')}
						</Box>
					</Box>
					<Box fontScale='p2' color='secondary-info' mbe={8}>
						{t('Channel_invitation')} {channel}
					</Box>
					<ButtonGroup>
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
				</Box>
			</Box>
		</Box>
	);
};

export default InvitationItem;
