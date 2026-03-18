import { Box, Icon, Tag } from '@rocket.chat/fuselage';
import { MessageAvatar } from '@rocket.chat/ui-avatar';
import type { KeyboardEvent, ReactNode } from 'react';

export type ActivityCardType = 'mention' | 'thread' | 'reaction' | 'star' | 'invitation' | 'all';

export const activityTypeIcon: Record<ActivityCardType, string> = {
	mention: 'at',
	thread: 'thread',
	reaction: 'emoji',
	star: 'star',
	invitation: 'flag',
	all: 'bell',
};

type ActivityCardProps = {
	type: ActivityCardType;
	descriptionLabel: string;
	timestamp: string;
	username?: string;
	displayName: string;
	messagePreview?: string;
	showUserAvatar: boolean;
	isSelected: boolean;
	onSelect: () => void;
	footer?: ReactNode;
	showTypeTag?: boolean;
};

const ActivityCard = ({
	type,
	descriptionLabel,
	timestamp,
	username,
	displayName,
	messagePreview,
	showUserAvatar,
	isSelected,
	onSelect,
	footer,
	showTypeTag = false,
}: ActivityCardProps) => (
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
		<Box display='flex' alignItems='center' justifyContent='space-between' mbe={8}>
			<Box display='flex' alignItems='center' rcx-box--animated gap={6} flexGrow={1} minWidth={0}>
				<Icon name={activityTypeIcon[type] as any} size='x14' color='secondary-info' flexShrink={0} />
				<Box
					fontScale='c1'
					color='secondary-info'
					overflow='hidden'
					style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
				>
					{descriptionLabel}
				</Box>
			</Box>
			<Box fontScale='c1' color='hint' flexShrink={0} mis={8}>
				{timestamp}
			</Box>
		</Box>

		<Box display='flex' alignItems='flex-start' rcx-box--animated gap={8}>
			{showUserAvatar && username && (
				<Box flexShrink={0}>
					<MessageAvatar username={username} size='x36' />
				</Box>
			)}
			<Box flexGrow={1} minWidth={0}>
				<Box display='flex' alignItems='baseline' rcx-box--animated gap={4} mbe={2}>
					<Box fontScale='p2m' color='default'>
						{displayName}
					</Box>
					{username && (
						<Box fontScale='c1' color='hint'>
							@{username}
						</Box>
					)}
				</Box>
				{messagePreview && (
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
						{messagePreview}
					</Box>
				)}
				{footer}
			</Box>
			{showTypeTag && (
				<Box flexShrink={0}>
					<Tag variant='secondary' small>
						{type}
					</Tag>
				</Box>
			)}
		</Box>
	</Box>
);

export default ActivityCard;
