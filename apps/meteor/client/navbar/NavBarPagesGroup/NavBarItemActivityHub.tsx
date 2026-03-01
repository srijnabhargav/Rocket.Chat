import { NavBarItem } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { useRouter, useCurrentRoutePath } from '@rocket.chat/ui-contexts';
import type { HTMLAttributes } from 'react';

type NavBarItemActivityHubProps = Omit<HTMLAttributes<HTMLElement>, 'is'>;

const NavBarItemActivityHub = (props: NavBarItemActivityHubProps) => {
	const router = useRouter();
	const handleActivityHub = useEffectEvent(() => {
		router.navigate('/activity-hub');
	});
	const currentRoute = useCurrentRoutePath();

	return <NavBarItem {...props} icon='clock' onClick={handleActivityHub} pressed={currentRoute?.includes('/activity-hub')} />;
};

export default NavBarItemActivityHub;

