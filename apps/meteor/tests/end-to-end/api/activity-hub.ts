import type { Credentials } from '@rocket.chat/api-client';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import type { Response } from 'supertest';

import { getCredentials, api, request } from '../../data/api-data';
import { sendSimpleMessage } from '../../data/chat.helper';
import { addUserToRoom, createRoom, deleteRoom } from '../../data/rooms.helper';
import { password } from '../../data/user';
import { createUser, deleteUser, login } from '../../data/users.helper';

describe('[Activity Hub]', () => {
	let testUser: IUser;
	let testUserCredentials: Credentials;
	let testChannel: IRoom;
	let mentionMessageId: IMessage['_id'];
	let starredMessageId: IMessage['_id'];

	before((done) => getCredentials(done));

	before(async () => {
		testUser = await createUser();
		testUserCredentials = await login(testUser.username as string, password);

		const channelRes = await createRoom({ type: 'c', name: `activity-hub-test-${Date.now()}` });
		testChannel = channelRes.body.channel;

		await addUserToRoom({ rid: testChannel._id, username: testUser.username as string });

		// Send a message that mentions testUser (as admin)
		const mentionRes = await sendSimpleMessage({
			roomId: testChannel._id,
			text: `Hello @${testUser.username} this is a mention`,
		});
		mentionMessageId = mentionRes.body.message._id;

		// testUser sends and stars their own message
		const ownMessageRes = await request
			.post(api('chat.sendMessage'))
			.set(testUserCredentials)
			.send({ message: { rid: testChannel._id, msg: 'Message to star' } });
		starredMessageId = ownMessageRes.body.message._id;

		await request.post(api('chat.starMessage')).set(testUserCredentials).send({ messageId: starredMessageId });
	});

	after(async () => {
		await deleteRoom({ type: 'c', roomId: testChannel._id });
		await deleteUser(testUser);
	});

	describe('[/activity-hub.mentions]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.mentions')).expect(401);
		});

		it('should return paginated response shape', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('should include the mention message for the mentioned user', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					const ids = res.body.messages.map((m: IMessage) => m._id);
					expect(ids).to.include(mentionMessageId);
				});
		});

		it('should not return mentions for a user who was not mentioned', async () => {
			const otherUser = await createUser();
			const otherCreds = await login(otherUser.username as string, password);

			await request
				.get(api('activity-hub.mentions'))
				.set(otherCreds)
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					const ids = res.body.messages.map((m: IMessage) => m._id);
					expect(ids).to.not.include(mentionMessageId);
				});

			await deleteUser(otherUser);
		});

		it('should accept roomType filter without error', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.query({ roomType: 'c' })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
				});
		});

		it('should reject invalid roomType value', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.query({ roomType: 'invalid' })
				.expect(400);
		});

		it('should accept unread filter without error', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.query({ unread: true })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
				});
		});

		it('should respect pagination params', async () => {
			await request
				.get(api('activity-hub.mentions'))
				.set(testUserCredentials)
				.query({ count: 1, offset: 0 })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body.messages.length).to.be.at.most(1);
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('count in response should equal messages array length', async () => {
			const res = await request.get(api('activity-hub.mentions')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.messages.length);
		});
	});

	describe('[/activity-hub.starred-messages]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.starred-messages')).expect(401);
		});

		it('should return paginated response shape', async () => {
			await request
				.get(api('activity-hub.starred-messages'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('should include the starred message', async () => {
			await request
				.get(api('activity-hub.starred-messages'))
				.set(testUserCredentials)
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					const ids = res.body.messages.map((m: IMessage) => m._id);
					expect(ids).to.include(starredMessageId);
				});
		});

		it('should accept roomType filter without error', async () => {
			await request
				.get(api('activity-hub.starred-messages'))
				.set(testUserCredentials)
				.query({ roomType: 'c' })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
				});
		});

		it('should reject unknown query params (additionalProperties: false)', async () => {
			await request
				.get(api('activity-hub.starred-messages'))
				.set(testUserCredentials)
				.query({ unread: true })
				.expect(400);
		});

		it('total should match count when all results fit in one page', async () => {
			const res = await request.get(api('activity-hub.starred-messages')).set(testUserCredentials).query({ count: 100 }).expect(200);
			expect(res.body.total).to.equal(res.body.count);
		});

		it('count in response should equal messages array length', async () => {
			const res = await request.get(api('activity-hub.starred-messages')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.messages.length);
		});
	});

	describe('[/activity-hub.threads]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.threads')).expect(401);
		});

		it('should return paginated response shape', async () => {
			await request
				.get(api('activity-hub.threads'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('should accept unread filter without error', async () => {
			await request
				.get(api('activity-hub.threads'))
				.set(testUserCredentials)
				.query({ unread: true })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
				});
		});

		it('count in response should equal messages array length', async () => {
			const res = await request.get(api('activity-hub.threads')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.messages.length);
		});
	});

	describe('[/activity-hub.reactions]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.reactions')).expect(401);
		});

		it('should return paginated response shape', async () => {
			await request
				.get(api('activity-hub.reactions'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('should reject unknown query params (additionalProperties: false)', async () => {
			await request
				.get(api('activity-hub.reactions'))
				.set(testUserCredentials)
				.query({ unread: true })
				.expect(400);
		});

		it('total should match count (reactions filter is in DB query, not post-filter)', async () => {
			const res = await request.get(api('activity-hub.reactions')).set(testUserCredentials).query({ count: 100 }).expect(200);
			expect(res.body.total).to.equal(res.body.count);
		});

		it('count in response should equal messages array length', async () => {
			const res = await request.get(api('activity-hub.reactions')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.messages.length);
		});
	});

	describe('[/activity-hub.invitations]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.invitations')).expect(401);
		});

		it('should return paginated response shape', async () => {
			await request
				.get(api('activity-hub.invitations'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('invitations').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('count in response should equal invitations array length', async () => {
			const res = await request.get(api('activity-hub.invitations')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.invitations.length);
		});
	});

	describe('[/activity-hub.activities]', () => {
		it('should require authentication', async () => {
			await request.get(api('activity-hub.activities')).expect(401);
		});

		it('should return paginated response shape with ActivityItem structure', async () => {
			await request
				.get(api('activity-hub.activities'))
				.set(testUserCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('activities').that.is.an('array');
					expect(res.body).to.have.property('count').that.is.a('number');
					expect(res.body).to.have.property('offset').that.is.a('number');
					expect(res.body).to.have.property('total').that.is.a('number');
				});
		});

		it('each activity item should have required fields', async () => {
			await request
				.get(api('activity-hub.activities'))
				.set(testUserCredentials)
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					for (const item of res.body.activities) {
						expect(item).to.have.property('_id').that.is.a('string');
						expect(item).to.have.property('type').that.is.oneOf(['mention', 'thread', 'reaction', 'star', 'invitation']);
						expect(item).to.have.property('rid').that.is.a('string');
						expect(item).to.have.property('roomName').that.is.a('string');
						expect(item).to.have.property('actor').that.is.an('object');
						expect(item).to.have.property('ts');
					}
				});
		});

		it('should accept roomType filter without error', async () => {
			await request
				.get(api('activity-hub.activities'))
				.set(testUserCredentials)
				.query({ roomType: 'c' })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('activities').that.is.an('array');
				});
		});

		it('should accept unread filter without error', async () => {
			await request
				.get(api('activity-hub.activities'))
				.set(testUserCredentials)
				.query({ unread: true })
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('activities').that.is.an('array');
				});
		});

		it('should respect pagination: offset + count should not overlap', async () => {
			const page1 = await request.get(api('activity-hub.activities')).set(testUserCredentials).query({ count: 1, offset: 0 }).expect(200);
			const page2 = await request.get(api('activity-hub.activities')).set(testUserCredentials).query({ count: 1, offset: 1 }).expect(200);

			expect(page1.body.activities.length).to.be.at.most(1);
			expect(page2.body.activities.length).to.be.at.most(1);

			if (page1.body.total > 1) {
				const ids1 = page1.body.activities.map((a: any) => a._id);
				const ids2 = page2.body.activities.map((a: any) => a._id);
				const overlap = ids1.filter((id: string) => ids2.includes(id));
				expect(overlap).to.have.lengthOf(0);
			}
		});

		it('activities should be sorted by timestamp descending', async () => {
			const res = await request.get(api('activity-hub.activities')).set(testUserCredentials).query({ count: 10 }).expect(200);

			const timestamps: number[] = res.body.activities.map((a: any) => new Date(a.ts).getTime());
			for (let i = 1; i < timestamps.length; i++) {
				expect(timestamps[i]).to.be.at.most(timestamps[i - 1]);
			}
		});

		it('count in response should equal activities array length', async () => {
			const res = await request.get(api('activity-hub.activities')).set(testUserCredentials).query({ count: 5 }).expect(200);
			expect(res.body.count).to.equal(res.body.activities.length);
		});
	});

	describe('[/activity-hub.markAllRead]', () => {
		it('should require authentication', async () => {
			await request.post(api('activity-hub.markAllRead')).expect(401);
		});

		it('should succeed and return success: true', async () => {
			await request
				.post(api('activity-hub.markAllRead'))
				.set(testUserCredentials)
				.send({})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
				});
		});

		it('should be idempotent — calling twice should not error', async () => {
			await request.post(api('activity-hub.markAllRead')).set(testUserCredentials).send({}).expect(200);
			await request
				.post(api('activity-hub.markAllRead'))
				.set(testUserCredentials)
				.send({})
				.expect(200)
				.expect((res: Response) => {
					expect(res.body).to.have.property('success', true);
				});
		});

		it('should reject unknown body params (additionalProperties: false)', async () => {
			await request
				.post(api('activity-hub.markAllRead'))
				.set(testUserCredentials)
				.send({ unknownParam: true })
				.expect(400);
		});
	});
});
