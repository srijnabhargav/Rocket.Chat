import { Tabs, IconButton, Select, Box } from '@rocket.chat/fuselage';
import type { SelectOption } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { Page, PageHeader, PageContent } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import MentionsTab from './tabs/MentionsTab';
import StarredMessagesTab from './tabs/StarredMessagesTab';

type TabName = 'mentions' | 'starred';
type RoomTypeFilter = 'all' | 'c' | 'd' | 'p';

const ActivityHubPage = (): ReactElement => {
	const { t } = useTranslation();
	const tab = useRouteParameter('tab') as TabName | undefined;
	const router = useRouter();
	const [roomType, setRoomType] = useState<RoomTypeFilter>('all');

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
					router.navigate('/activity-hub/mentions', { replace: true });
				}
			}),
		[router],
	);

	const handleTabClick = useCallback((tab: TabName) => () => router.navigate(`/activity-hub/${tab}`), [router]);

	const handleClose = useEffectEvent(() => {
		router.navigate('/home');
	});

	return (
		<Page background='room'>
			<PageHeader title={t('Activity_Hub')}>
				<IconButton icon='cross' title={t('Close')} onClick={handleClose} small />
			</PageHeader>
			<Box display='flex' alignItems='center' justifyContent='space-between' paddingInline={24} paddingBlock={8}>
				<Tabs flexShrink={0}>
					<Tabs.Item selected={tab === 'mentions'} onClick={handleTabClick('mentions')}>
						{t('Mentions')}
					</Tabs.Item>
					<Tabs.Item selected={tab === 'starred'} onClick={handleTabClick('starred')}>
						{t('Starred_Messages')}
					</Tabs.Item>
				</Tabs>
				<Box width='x200'>
					<Select options={filterOptions} value={roomType} onChange={(value) => setRoomType(value as RoomTypeFilter)} />
				</Box>
			</Box>
			<PageContent>
				{tab === 'mentions' && <MentionsTab roomType={roomType} />}
				{tab === 'starred' && <StarredMessagesTab roomType={roomType} />}
			</PageContent>
		</Page>
	);
};

export default ActivityHubPage;

