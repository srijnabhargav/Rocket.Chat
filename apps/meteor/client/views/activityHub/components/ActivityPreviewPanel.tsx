import type { IMessage } from '@rocket.chat/core-typings';
import { isThreadMessage } from '@rocket.chat/core-typings';
import {
	Box,
	Button,
	Icon,
	MessageDivider,
	Throbber,
	States,
	StatesIcon,
	StatesTitle,
	StatesSubtitle,
} from '@rocket.chat/fuselage';
import { VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useEndpoint, useUserSubscription } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import { useFormatDate } from '../../../hooks/useFormatDate';
import { mapMessageFromApi } from '../../../lib/utils/mapMessageFromApi';
import { legacyJumpToMessage } from '../../../lib/utils/legacyJumpToMessage';
import { isMessageNewDay } from '../../room/MessageList/lib/isMessageNewDay';
import PreviewMessageCard from './PreviewMessageCard';

type ActivityPreviewPanelProps = {
	message: IMessage | null;
};

const ActivityPreviewPanel = ({ message }: ActivityPreviewPanelProps) => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const getThreadMessages = useEndpoint('GET', '/v1/chat.getThreadMessages');
	const getMessage = useEndpoint('GET', '/v1/chat.getMessage');

	const subscription = useUserSubscription(message?.rid ?? '');
	const roomName = subscription?.fname || subscription?.name || message?.rid || '';

	const isThread = !!message && (isThreadMessage(message) || !!message.tcount);
	const tmid = message?.tmid || (isThread && message?.tcount ? message._id : undefined);

	const threadQuery = useQuery({
		queryKey: ['activity-preview', 'thread', tmid],
		enabled: !!tmid,
		queryFn: async () => {
			const result = await getThreadMessages({ tmid: tmid as string, count: 50, offset: 0 });
			return result.messages.map(mapMessageFromApi);
		},
	});

	const mainMessageQuery = useQuery({
		queryKey: ['activity-preview', 'message', message?._id],
		enabled: !!message && !isThread,
		queryFn: async () => {
			const result = await getMessage({ msgId: message!._id });
			return mapMessageFromApi(result.message);
		},
	});

	const handleOpenInChannel = () => {
		if (message) {
			void legacyJumpToMessage(message);
		}
	};

	if (!message) {
		return (
			<Box
				display='flex'
				flexDirection='column'
				alignItems='center'
				justifyContent='center'
				height='full'
				color='hint'
				flexGrow={1}
			>
				<Icon name='bell' size='x48' mbe={16} color='hint' />
				<Box fontScale='p1' color='hint' textAlign='center' pi={32}>
					{t('Select_activity_to_preview')}
				</Box>
			</Box>
		);
	}

	const isLoading = isThread ? threadQuery.isLoading : mainMessageQuery.isLoading;
	const isError = isThread ? threadQuery.isError : mainMessageQuery.isError;
	const messages: IMessage[] = isThread
		? [message, ...(threadQuery.data ?? []).filter((m) => m._id !== message._id)]
		: mainMessageQuery.data
			? [mainMessageQuery.data]
			: message
				? [message]
				: [];

	return (
		<Box display='flex' flexDirection='column' height='full'>
			{/* Panel header */}
			<Box
				display='flex'
				alignItems='center'
				justifyContent='space-between'
				paddingInline={16}
				paddingBlock={12}
				borderBlockEnd='1px solid'
				borderColor='stroke-extra-light'
				flexShrink={0}
			>
				<Box display='flex' alignItems='center' style={{ gap: '8px' }}>
					<Icon name={isThread ? 'thread' : 'hashtag'} size='x20' color='secondary-info' />
					<Box fontScale='p2m' color='default'>
						{isThread ? t('Thread_in') : ''} #{roomName}
					</Box>
				</Box>
				<Button small secondary onClick={handleOpenInChannel}>
					<Icon name='arrow-forward' size='x16' mie={4} />
					{t('Open_in_channel')}
				</Button>
			</Box>

			{/* Panel body */}
			<Box display='flex' flexDirection='column' flexGrow={1} overflow='hidden'>
				{isLoading && (
					<Box display='flex' justifyContent='center' alignItems='center' paddingBlock={24}>
						<Throbber size='x12' />
					</Box>
				)}

				{isError && (
					<States>
						<StatesIcon name='warning' />
						<StatesTitle>{t('Error')}</StatesTitle>
						<StatesSubtitle>{t('Error_loading_messages')}</StatesSubtitle>
					</States>
				)}

				{!isLoading && !isError && messages.length > 0 && (
					<VirtualizedScrollbars>
						<Virtuoso
							totalCount={messages.length}
							data={messages}
							itemContent={(index, msg) => {
								const previous = messages[index - 1];
								const newDay = isMessageNewDay(msg, previous);
								return (
									<Box key={msg._id}>
										{newDay && <MessageDivider>{formatDate(msg.ts)}</MessageDivider>}
										<PreviewMessageCard message={msg} isHighlighted={msg._id === message._id} />
									</Box>
								);
							}}
						/>
					</VirtualizedScrollbars>
				)}
			</Box>
		</Box>
	);
};

export default ActivityPreviewPanel;
