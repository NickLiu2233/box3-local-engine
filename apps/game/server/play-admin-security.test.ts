import { isPlayAdminEnabled } from './play-admin-security';

describe('play admin availability', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      BOX_DEPLOYMENT_MODE: 'play',
      BOX_PLAY_ADMIN_TOKEN: 'owner-token-at-least-sixteen-characters',
      BOX_PLAY_LIBRARY_PATH: '/app/play-worlds',
    };
    delete process.env.BOX_PLAY_LIBRARY_READ_ONLY;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('hides Play admin tools when the map library is read-only', () => {
    process.env.BOX_PLAY_LIBRARY_READ_ONLY = 'true';
    expect(isPlayAdminEnabled()).toBe(false);
  });

  test.each(['TRUE', ' True '])(
    'normalizes the read-only environment flag value %p',
    (value) => {
      process.env.BOX_PLAY_LIBRARY_READ_ONLY = value;
      expect(isPlayAdminEnabled()).toBe(false);
    },
  );

  test('keeps Play admin tools available for a writable map library', () => {
    process.env.BOX_PLAY_LIBRARY_READ_ONLY = 'false';
    expect(isPlayAdminEnabled()).toBe(true);
  });

  test('keeps the owner token available to Player Service administrators', () => {
    process.env.BOX_DEPLOYMENT_MODE = 'player-service';
    process.env.BOX_PLAY_LIBRARY_READ_ONLY = 'true';
    expect(isPlayAdminEnabled()).toBe(true);
  });
});
