import { Tabs } from '@rocket.chat/fuselage';
import { Page, PageHeader, PageContent } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import MentionsTab from './tabs/MentionsTab';
import StarredMessagesTab from './tabs/StarredMessagesTab';

type TabName = 'mentions' | 'starred';

const ActivityHubPage = (): ReactElement => {
	const { t } = useTranslation();
	const tab = useRouteParameter('tab') as TabName | undefined;
	const router = useRouter();

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

	return (
		<Page background='room'>
			<PageHeader title={t('Activity_Hub')} />
			<Tabs flexShrink={0}>
				<Tabs.Item selected={tab === 'mentions'} onClick={handleTabClick('mentions')}>
					{t('Mentions')}
				</Tabs.Item>
				<Tabs.Item selected={tab === 'starred'} onClick={handleTabClick('starred')}>
					{t('Starred_Messages')}
				</Tabs.Item>
			</Tabs>
			<PageContent>
				{tab === 'mentions' && <MentionsTab />}
				{tab === 'starred' && <StarredMessagesTab />}
			</PageContent>
		</Page>
	);
};

export default ActivityHubPage;

