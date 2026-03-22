import { render, screen } from '@testing-library/react';
import { forwardRef } from 'react';

import VirtualList from './VirtualList';

const useVirtualizerMock = jest.fn();

jest.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (options: unknown) => useVirtualizerMock(options),
}));

jest.mock('@rocket.chat/ui-client', () => ({
	...jest.requireActual('@rocket.chat/ui-client'),
	CustomScrollbars: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CustomScrollbars({ children, ...props }, ref) {
		return (
			<div ref={ref} {...props}>
				{children}
			</div>
		);
	}),
}));

describe('VirtualList', () => {
	beforeEach(() => {
		useVirtualizerMock.mockImplementation(({ count, estimateSize }: { count: number; estimateSize: (index: number) => number }) => ({
			getVirtualItems: () =>
				Array.from({ length: count }, (_, index) => ({
					key: index,
					index,
					start: index * estimateSize(index),
				})),
			getTotalSize: () => count * estimateSize(0),
			measureElement: () => undefined,
		}));
	});

	afterEach(() => {
		useVirtualizerMock.mockReset();
	});

	it('renders the visible items', () => {
		render(<VirtualList items={['one', 'two', 'three']} totalCount={3} renderItem={(item) => <div>{item}</div>} />);

		expect(screen.getByText('one')).toBeInTheDocument();
		expect(screen.getByText('two')).toBeInTheDocument();
		expect(screen.getByText('three')).toBeInTheDocument();
	});

	it('triggers onEndReached only once per loaded slice', () => {
		const onEndReached = jest.fn();
		const { rerender } = render(
			<VirtualList items={['one', 'two']} totalCount={4} onEndReached={onEndReached} renderItem={(item) => <div>{item}</div>} />,
		);

		expect(onEndReached).toHaveBeenCalledTimes(1);

		rerender(<VirtualList items={['one', 'two']} totalCount={4} onEndReached={onEndReached} renderItem={(item) => <div>{item}</div>} />);

		expect(onEndReached).toHaveBeenCalledTimes(1);
	});

	it('triggers onEndReached again when more items are loaded', () => {
		const onEndReached = jest.fn();
		const { rerender } = render(
			<VirtualList items={['one', 'two']} totalCount={4} onEndReached={onEndReached} renderItem={(item) => <div>{item}</div>} />,
		);

		rerender(
			<VirtualList
				items={['one', 'two', 'three']}
				totalCount={4}
				onEndReached={onEndReached}
				renderItem={(item) => <div>{item}</div>}
			/>,
		);

		expect(onEndReached).toHaveBeenCalledTimes(2);
	});
});
