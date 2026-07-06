import { expect, test } from '@jest/globals';
import { isAllowedSource } from '../utils/access-policy.js';

test('ACCESS_POLICY_ALLOWS_OWNER_DIRECT_MESSAGE', () => {
  expect(isAllowedSource({
    userId: 'owner-user',
    allowedUserIds: ['owner-user'],
  })).toEqual({
    isAllowed: true,
    userAllowed: true,
    groupAllowed: true,
  });
});

test('ACCESS_POLICY_REJECTS_UNLISTED_USER', () => {
  expect(isAllowedSource({
    userId: 'guest-user',
    allowedUserIds: ['owner-user'],
  }).isAllowed).toBe(false);
});

test('ACCESS_POLICY_REQUIRES_ALLOWED_GROUP_WHEN_GROUP_ALLOWLIST_EXISTS', () => {
  expect(isAllowedSource({
    userId: 'owner-user',
    groupId: 'group-b',
    allowedUserIds: ['owner-user'],
    allowedGroupIds: ['group-a'],
  }).isAllowed).toBe(false);
});
