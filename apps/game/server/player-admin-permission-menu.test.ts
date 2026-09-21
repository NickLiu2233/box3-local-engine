import {
  PLAYER_ADMIN_GRANTABLE_CAPABILITIES,
} from '../shared/player-admin-policy';
import {
  PLAYER_ADMIN_PERMISSION_MENU,
} from '../shared/player-admin-permission-menu';

describe('player-admin permission menu', () => {
  test('shows every grantable API capability exactly once under its matching menu section', () => {
    const capabilities = PLAYER_ADMIN_PERMISSION_MENU.flatMap((category) =>
      category.sections.flatMap((section) => section.capabilities),
    );
    expect(capabilities).toHaveLength(new Set(capabilities).size);
    expect([...capabilities].sort()).toEqual([...PLAYER_ADMIN_GRANTABLE_CAPABILITIES].sort());
  });
});
