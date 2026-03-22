import { render, screen } from '@testing-library/react';
import type { IThreadMainMessage } from '@rocket.chat/core-typings';

import ThreadList from './ThreadList';
import { createFakeRoom } from '../../../../../tests/mocks/data';

const fakeRoom = createFakeRoom({ t: 'c' });
const useThreadsListMock = jest.fn();

jest.mock('./components/ThreadListItem', () => ({ thread }: { thread: IThreadMainMessage }) => <div data-testid='thread-row'>{thread.msg}</div>);
jest.mock('./hooks/useThreadsList', () => ({
	useThreadsList: (...args: unknown[]) => useThreadsListMock(...args),
}));
jest.mock('../../../../components/VirtualList', () => ({
	VirtualList: ({ items, renderItem }: { items: IThreadMainMessage[]; renderItem: (item: IThreadMainMessage, index: number) => React.ReactNode }) => (
		<div role='list'>
			{items.map((item, index) => (
				<div key={item._id}>{renderItem(item, index)}</div>
			))}
		</div>
	),
}));
jest.mock('../../contexts/RoomContext', () => ({
	useRoom: () => fakeRoom,
	useRoomSubscription: () => fakeRoom,
}));
jest.mock('@rocket.chat/ui-contexts', () => ({
	...jest.requireActual('@rocket.chat/ui-contexts'),
	useTranslation: () => (key: string) => key,
	useUserId: () => 'user-id',
	useRoomToolbox: () => ({ closeTab: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../../../app/utils/lib/i18n', () => ({
	t: (key: string) => key,
}));
jest.mock('../../hooks/useGoToThread', () => ({
	useGoToThread: () => jest.fn(),
}));

describe('ThreadList Component', () => {
	const makeThread = (id: string): IThreadMainMessage =>
		({
			_id: id,
			rid: 'room-id',
			msg: `Thread ${id}`,
			ts: new Date(),
			u: { _id: 'user-id', username: 'testuser', name: 'Test User' },
			_updatedAt: new Date(),
			tlm: new Date(),
			tcount: 2,
			replies: [],
		}) as IThreadMainMessage;

	beforeEach(() => {
		useThreadsListMock.mockReturnValue({
			isPending: false,
			error: undefined,
			isSuccess: true,
			data: {
				items: [],
				itemCount: 0,
			},
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});
	});

	afterEach(() => {
		useThreadsListMock.mockReset();
	});

	it('should render the loading state', () => {
		useThreadsListMock.mockReturnValue({
			isPending: true,
			error: undefined,
			isSuccess: false,
			data: undefined,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});

		render(<ThreadList />);

		expect(document.querySelector('.rcx-throbber')).toBeInTheDocument();
	});

	it('should display an error message when in error state', async () => {
		useThreadsListMock.mockReturnValue({
			isPending: false,
			error: { error: 'error-not-allowed' },
			isSuccess: false,
			data: undefined,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});

		render(<ThreadList />);

		expect(await screen.findByText('error-not-allowed')).toBeInTheDocument();
	});

	it('should display the empty state when there are no threads', () => {
		render(<ThreadList />);

		expect(screen.getByText('No_Threads')).toBeInTheDocument();
	});

	it('should render a row for each thread item', () => {
		const items = [makeThread('1'), makeThread('2')];
		useThreadsListMock.mockReturnValue({
			isPending: false,
			error: undefined,
			isSuccess: true,
			data: {
				items,
				itemCount: items.length,
			},
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});

		render(<ThreadList />);

		expect(screen.getAllByTestId('thread-row')).toHaveLength(items.length);
	});
});
