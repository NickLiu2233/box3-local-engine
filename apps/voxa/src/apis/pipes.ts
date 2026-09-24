import { LoginUserInfoVO } from '@box/apis';

export const pipes = {
  userInfoToUserDetail(res: LoginUserInfoVO) {
    return {
      ...res,
      /**
       * @WARNING java 接口没有传 password 字段
       */
      password: res.isSetPassword ? '******' : null,
      ban_editor: res.banEditor,
      auth_info: res.authInfo,
      first_login: res.firstLogin,
      muted_till: new Date(res.mutedTill),
      avatar_hash: res.avatarHash,
      /**
       * @WARNING java 接口 res.avatarStatus 可以为空, avatar_status 不能为空, 不一致
       */
      avatar_status: res.avatarStatus ?? 0,
      banned_till: new Date(res.bannedTill),
      birthday: new Date(res.birthday),
      description: res.description ?? null,
      email: res.email ?? null,
      language: res.language ?? null,
      blocklist: res.blocklist ?? null,
      /**
       * @WARNING java 接口 res.wearingSkins 子属性均可以为空, wearing_skins 子属性均不能为空, 不一致
       */
      wearing_skins: {
        hips: '',
        torso: '',
        neck: '',
        head: '',
        leftShoulder: '',
        leftUpperArm: '',
        leftLowerArm: '',
        leftHand: '',
        rightShoulder: '',
        rightUpperArm: '',
        rightLowerArm: '',
        rightHand: '',
        leftUpperLeg: '',
        leftLowerLeg: '',
        leftFoot: '',
        rightUpperLeg: '',
        rightLowerLeg: '',
        rightFoot: '',
        ...res.wearingSkins,
      },
    };
  },
};
