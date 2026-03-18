import type { IMessage } from '@rocket.chat/core-typings';
import { Tabs, IconButton, Select, Box, ToggleSwitch, Button } from '@rocket.chat/fuselage';
import type { SelectOption } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { Page, PageHeader } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter, useEndpoint } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ActivityItem } from '@rocket.chat/rest-typings';

import ActivityPreviewPanel from './components/ActivityPreviewPanel';
import AllTab from './tabs/AllTab';
import InvitationsTab from './tabs/InvitationsTab';
import MentionsTab from './tabs/MentionsTab';
import ReactionsTab from './tabs/ReactionsTab';
import StarredMessagesTab from './tabs/StarredMessagesTab';
import ThreadsTab from './tabs/ThreadsTab';

type TabName = 'all' | 'mentions' | 'threads' | 'reactions' | 'starred' | 'invitations';
type RoomTypeFilter = 'all' | 'c' | 'd' | 'p';

type SelectedItem =
	| { kind: 'message'; message: IMessage }
	| { kind: 'activity'; activity: ActivityItem }
	| null;

const VALID_TABS: TabName[] = ['all', 'mentions', 'threads', 'reactions', 'starred', 'invitations'];

const ActivityHubPage = (): ReactElement => {
	const { t } = useTranslation();
	const tab = useRouteParameter('tab') as TabName | undefined;
	const router = useRouter();
	const [roomType, setRoomType] = useState<RoomTypeFilter>('all');
	const [unread, setUnread] = useState(false);
	const [selected, setSelected] = useState<SelectedItem>(null);
	const queryClient = useQueryClient();

	const markAllRead = useEndpoint('POST', '/v1/activity-hub.markAllRead');

	const markAllReadMutation = useMutation({
		mutationFn: () => markAllRead({}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['activity-hub'] });
		},
	});

	const filterOptions: SelectOption[] = useMemo(
		() => [
			['all', t('All_rooms')],
			['c', t('Channels')],
			['d', t('Direct_Messages')],
			['p', t('Private_Groups')],
		],
		[t],
	);

	useEffect(
		() =>
			router.subscribeToRouteChange(() => {
				if (router.getRouteName() !== 'activity-hub') {
					return;
				}

				const { tab: currentTab } = router.getRouteParameters();

				if (!currentTab || !VALID_TABS.includes(currentTab as TabName)) {
					router.navigate('/activity-hub/all', { replace: true });
				}
			}),
		[router],
	);

	const handleTabClick = useCallback(
		(nextTab: TabName) => () => {
			setSelected(null);
			router.navigate(`/activity-hub/${nextTab}`);
		},
		[router],
	);

	const handleClose = useEffectEvent(() => {
		router.navigate('/home');
	});

	const handleSelectMessage = useCallback((message: IMessage) => {
		setSelected({ kind: 'message', message });
	}, []);

	const handleSelectActivity = useCallback((activity: ActivityItem) => {
		setSelected({ kind: 'activity', activity });
	}, []);

	const selectedMessageId = selected?.kind === 'message' ? selected.message._id : undefined;
	const selectedActivityId = selected?.kind === 'activity' ? selected.activity._id : undefined;

	// For ActivityItem selections, use the msgId to fetch the full message in the preview panel.
	// We pass a minimal IMessage stub so the panel can immediately render the message ID and
	// room context while it fetches the full message body via its own query.
	const previewMessage: IMessage | null = (() => {
		if (!selected) return null;
		if (selected.kind === 'message') return selected.message;
		if (selected.kind === 'activity' && selected.activity.msgId) {
			return {
				_id: selected.activity.msgId,
				rid: selected.activity.rid,
				msg: selected.activity.msg ?? '',
				ts: new Date(selected.activity.ts),
				u: {
					_id: selected.activity.actor._id,
					username: selected.activity.actor.username,
					name: selected.activity.actor.name,
				},
				_updatedAt: new Date(selected.activity.ts),
			} as IMessage;
		}
		return null;
	})();

	const isInvitationsTab = tab === 'invitations';

	return (
		<Page background='room'>
			<PageHeader title={t('Activity_Hub')}>
				<Button
					small
					secondary
					onClick={() => markAllReadMutation.mutate()}
					disabled={markAllReadMutation.isPending}
				>
					{t('Mark_all_as_read_button')}
				</Button>
				<IconButton icon='cross' title={t('Close')} onClick={handleClose} small />
			</PageHeader>

			<Box
				display='flex'
				alignItems='center'
				justifyContent='space-between'
				paddingInline={16}
				paddingBlock={8}
				flexShrink={0}
				borderBlockEnd='1px solid'
				borderColor='stroke-extra-light'
			>
				<Tabs flexShrink={0}>
					<Tabs.Item selected={tab === 'all'} onClick={handleTabClick('all')}>
						{t('All')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'mentions'} onClick={handleTabClick('mentions')}>
						{t('Mentions')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'threads'} onClick={handleTabClick('threads')}>
						{t('Threads')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'reactions'} onClick={handleTabClick('reactions')}>
						{t('Reactions')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'starred'} onClick={handleTabClick('starred')}>
						{t('Starred_Messages')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'invitations'} onClick={handleTabClick('invitations')}>
						{t('Invitations')}
					</Tabs.Item>
				</Tabs>

				<Box display='flex' alignItems='center' rcx-box--animated gap={12}>
					{!isInvitationsTab && (
						<Box display='flex' alignItems='center' gap={6}>
							<ToggleSwitch
								id='activity-hub-unread-toggle'
								checked={unread}
								onChange={() => setUnread((prev) => !prev)}
							/>
							<Box
								is='label'
								htmlFor='activity-hub-unread-toggle'
								fontScale='p2'
								color='default'
							>
								{t('Unread_messages')}
							</Box>
						</Box>
					)}
					<Box width='x180'>
						<Select
							options={filterOptions}
							value={roomType}
							onChange={(value) => setRoomType(value as RoomTypeFilter)}
						/>
					</Box>
				</Box>
			</Box>

			<Box display='flex' flexGrow={1} overflow='hidden'>
				<Box
					display='flex'
					flexDirection='column'
					flexShrink={0}
					overflow='hidden'
					borderInlineEnd='1px solid'
					borderColor='stroke-extra-light'
					width='x420'
				>
					{tab === 'all' && (
						<AllTab
							roomType={roomType}
							unread={unread}
							onSelectActivity={handleSelectActivity}
							selectedActivityId={selectedActivityId}
						/>
					)}
					{tab === 'mentions' && (
						<MentionsTab
							roomType={roomType}
							unread={unread}
							onSelectMessage={handleSelectMessage}
							selectedMessageId={selectedMessageId}
						/>
					)}
					{tab === 'threads' && (
						<ThreadsTab
							roomType={roomType}
							unread={unread}
							onSelectMessage={handleSelectMessage}
							selectedMessageId={selectedMessageId}
						/>
					)}
					{tab === 'reactions' && (
						<ReactionsTab
							roomType={roomType}
							onSelectMessage={handleSelectMessage}
							selectedMessageId={selectedMessageId}
						/>
					)}
					{tab === 'starred' && (
						<StarredMessagesTab
							roomType={roomType}
							onSelectMessage={handleSelectMessage}
							selectedMessageId={selectedMessageId}
						/>
					)}
					{tab === 'invitations' && <InvitationsTab />}
				</Box>

				<Box display='flex' flexDirection='column' flexGrow={1} overflow='hidden'>
					{!isInvitationsTab && <ActivityPreviewPanel message={previewMessage} />}
					{isInvitationsTab && (
						<Box
							display='flex'
							flexDirection='column'
							alignItems='center'
							justifyContent='center'
							height='full'
							color='hint'
						>
							<Box fontScale='p1' color='hint' textAlign='center' pi={32}>
								{t('Select_activity_to_preview')}
							</Box>
						</Box>
					)}
				</Box>
			</Box>
		</Page>
	);
};

export default ActivityHubPage;
