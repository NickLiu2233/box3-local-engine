import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { boxApiClient } from 'src/client/api/box-api-client';
import { RootState } from 'src/redux/edit';

import { CollaboratorInfoPanel } from './collaborator';
import style from './index.module.scss';
import { ManageMentPanel } from './management-panel';
import { RoleManage } from './modals/role-manage';

export type UserRolesList = { [userId: string]: string[] };
export type userInfoType = {
  userId: string;
  name?: string;
  avatarHash?: string;
  roles?: string[];
};
export type UserInfoList = userInfoType[];

export enum InnerRoles {
  owner = 'owner',
  allCollaborator = 'allCollaborator',
  guest = 'guest',
  admin = 'admin',
  contributor = 'contributor',
  banned = 'banned',
  application = 'application',
}
export type MenuItemType = {
  text: string;
  id: string;
};

export const CollaborationPanel = (props: {
  closeCollaboration: () => void;
}) => {
  const { closeCollaboration } = props;
  const { groups, owner, users, localOwner } = useSelector(
    (state: RootState) => state.permission,
  );

  const [isShowRoleManageModal, setIsShowRoleManageModal] = useState(false);

  // 获取所有用户ID对应的roles
  const userRolesList = useMemo((): UserRolesList => {
    const list: UserRolesList = {};

    const groupNames = Object.keys(groups);
    const userIds = Object.keys(users);
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      list[userId] = [];
      if (userId === owner) {
        list[userId].push(InnerRoles.owner);
      }
      for (let j = 0; j < groupNames.length; j++) {
        const members = groups[groupNames[j]].members;
        if (groupNames[j] !== 'guest' && members[userId]) {
          list[userId].push(groupNames[j]);
        }
      }
    }
    return list;
  }, [groups, users, owner]);

  // 根据用户ID获取用户信息
  const getUsersInfoByIds = useCallback(
    async (userIds: string[]) => {
      if (!userIds.length) {
        return [];
      }
      // 使用新的 box-api-client 批量获取用户资料
      try {
        const response = await boxApiClient.users.batchGetUserProfiles({
          ids: userIds.map((id) => Number(id)),
          page: 1,
          pageSize: userIds.length > 100 ? 500 : 100,
        });
        const userInfoList: UserInfoList = userIds.map((userId) => {
          const userInfo = response.users.find(
            (item) => item.userId.toString() === userId,
          );
          return {
            userId,
            name: userInfo?.displayName,
            avatarHash: userInfo?.avatarUrl,
            roles: userRolesList[userId],
          };
        });
        return userInfoList;
      } catch (error) {
        console.error('Failed to fetch user profiles:', error);
        return [];
      }
    },
    [userRolesList],
  );

  return (
    <div>
      <div
        className={style.closeWrapper}
        onClick={(ev) => {
          ev.stopPropagation();
          closeCollaboration();
        }}
        onMouseDown={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          closeCollaboration();
        }}
      />
      {isShowRoleManageModal && (
        <RoleManage close={() => setIsShowRoleManageModal(false)} />
      )}
      {localOwner ? (
        <ManageMentPanel
          getUsersInfoByIds={getUsersInfoByIds}
          userRolesList={userRolesList}
          showRoleManageModal={() => setIsShowRoleManageModal(true)}
        />
      ) : (
        <CollaboratorInfoPanel
          getUsersInfoByIds={getUsersInfoByIds}
          userRolesList={userRolesList}
        />
      )}
    </div>
  );
};
