const { Assets, User } = require('../models');

describe('Models Import Test', () => {
  test('should import models successfully', () => {
    expect(Assets).toBeDefined();
    expect(User).toBeDefined();
  });

  test('Assets model should have correct name', () => {
    expect(Assets.name).toBe('assets');
  });

  test('User model should have correct name', () => {
    expect(User.name).toBe('users');
  });
});