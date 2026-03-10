import { Tabs, IconButton, Select, Box, ToggleSwitch, Button } from '@rocket.chat/fuselage';
import type { SelectOption } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { Page, PageHeader, PageContent } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter, useEndpoint } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import AllTab from './tabs/AllTab';
import InvitationsTab from './tabs/InvitationsTab';
import MentionsTab from './tabs/MentionsTab';
import ReactionsTab from './tabs/ReactionsTab';
import StarredMessagesTab from './tabs/StarredMessagesTab';
import ThreadsTab from './tabs/ThreadsTab';

type TabName = 'all' | 'mentions' | 'threads' | 'reactions' | 'starred' | 'invitations';
type RoomTypeFilter = 'all' | 'c' | 'd' | 'p';

const ActivityHubPage = (): ReactElement => {
	const { t } = useTranslation();
	const tab = useRouteParameter('tab') as TabName | undefined;
	const router = useRouter();
	const [roomType, setRoomType] = useState<RoomTypeFilter>('all');
	const [unread, setUnread] = useState(false);
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
			['all', t('All')],
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

				const { tab } = router.getRouteParameters();

				if (!tab) {
					router.navigate('/activity-hub/all', { replace: true });
				}
			}),
		[router],
	);

	const handleTabClick = useCallback((tab: TabName) => () => router.navigate(`/activity-hub/${tab}`), [router]);

	const handleClose = useEffectEvent(() => {
		router.navigate('/home');
	});

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
			<Box display='flex' alignItems='center' justifyContent='space-between' paddingInline={24} paddingBlock={8}>
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
				<Box display='flex' alignItems='center' style={{ columnGap: '12px' }}>
					{!isInvitationsTab && (
						<Box display='flex' alignItems='center' style={{ columnGap: '8px' }}>
							<ToggleSwitch
								id='activity-hub-unread-toggle'
								checked={unread}
								onChange={() => setUnread((prev) => !prev)}
							/>
							<Box is='label' htmlFor='activity-hub-unread-toggle' fontScale='p2' color='default' style={{ cursor: 'pointer' }}>
								{t('Unread')}
							</Box>
						</Box>
					)}
					<Box width='x200'>
						<Select
							options={filterOptions}
							value={roomType}
							onChange={(value) => setRoomType(value as RoomTypeFilter)}
						/>
					</Box>
				</Box>
			</Box>
			<PageContent>
				{tab === 'all' && <AllTab roomType={roomType} unread={unread} />}
				{tab === 'mentions' && <MentionsTab roomType={roomType} unread={unread} />}
				{tab === 'threads' && <ThreadsTab roomType={roomType} unread={unread} />}
				{tab === 'reactions' && <ReactionsTab roomType={roomType} />}
				{tab === 'starred' && <StarredMessagesTab roomType={roomType} />}
				{tab === 'invitations' && <InvitationsTab />}
			</PageContent>
		</Page>
	);
};

export default ActivityHubPage;
