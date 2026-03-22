import { mockAppRoot } from '@rocket.chat/mock-providers';
import { render, screen } from '@testing-library/react';

import ContactInfoHistory from './ContactInfoHistory';

jest.mock('../../../../../components/VirtualList', () => ({
	VirtualList: ({ items, renderItem }: any) => (
		<div role='list'>
			{items.map((item: any, index: number) => (
				<div key={index}>{renderItem(item, index)}</div>
			))}
		</div>
	),
}));

jest.mock('../../../../../../app/utils/rocketchat.info', () => ({
	Info: { version: '1.0.0' },
}));

jest.mock('../../../../../hooks/useHasLicenseModule', () => ({
	useHasLicenseModule: jest.fn(() => ({ data: true, isLoading: false })),
}));

jest.mock('../../../hooks/useOmnichannelSource', () => ({
	useOmnichannelSource: jest.fn(() => ({
		getSourceName: (source: any) => source?.type || 'unknown',
	})),
}));

const contact = {
	_id: 'contact-id',
	name: 'Test Contact',
	username: 'test.contact',
	emails: [{ address: 'test@example.com' }],
	phone: [{ phoneNumber: '123456789' }],
	devideId: 'device-id',
	ts: new Date(),
	_updatedAt: new Date(),
	channels: [
		{
			name: 'widget',
			label: 'Widget',
			details: {
				type: 'widget',
			},
		},
	],
} as any;

describe('ContactInfoHistory', () => {
	it('should render loading state', () => {
		render(<ContactInfoHistory contact={contact} setChatId={jest.fn()} />, {
			wrapper: mockAppRoot()
				.withEndpoint('GET', '/v1/omnichannel/contacts.history', () => ({
					history: [],
					count: 0,
					offset: 0,
					total: 0,
				}))
				.build(),
		});

		expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
		expect(document.querySelector('.rcx-throbber')).toBeInTheDocument();
	});

	it('should render empty state', async () => {
		render(<ContactInfoHistory contact={contact} setChatId={jest.fn()} />, {
			wrapper: mockAppRoot()
				.withEndpoint('GET', '/v1/omnichannel/contacts.history', () => ({
					history: [],
					count: 0,
					offset: 0,
					total: 0,
				}))
				.build(),
		});

		expect(await screen.findByText('No_history_yet')).toBeInTheDocument();
	});

	it('should render history items', async () => {
		const history = [
			{
				_id: 'chat-id-1',
				ts: new Date().toISOString(),
				v: { _id: 'visitor-id' },
				msgs: 1,
				source: { type: 'widget' },
				lastMessage: { rid: 'chat-id-1', msg: 'Hello', ts: new Date().toISOString() },
				verified: true,
			},
		] as any;

		render(<ContactInfoHistory contact={contact} setChatId={jest.fn()} />, {
			wrapper: mockAppRoot()
				.withEndpoint('GET', '/v1/omnichannel/contacts.history', () => ({
					history,
					count: 1,
					offset: 0,
					total: 1,
				}))
				.build(),
		});

		expect(await screen.findByText('Showing_current_of_total')).toBeInTheDocument();
		expect(screen.getByText('Hello')).toBeInTheDocument();
	});

	it('should render error state', async () => {
		render(<ContactInfoHistory contact={contact} setChatId={jest.fn()} />, {
			wrapper: mockAppRoot()
				.withEndpoint('GET', '/v1/omnichannel/contacts.history', () => {
					throw new Error('error');
				})
				.build(),
		});

		expect(await screen.findByText('Something_went_wrong')).toBeInTheDocument();
	});
});
