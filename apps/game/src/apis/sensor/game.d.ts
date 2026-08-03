/**
 * 接入可以参考： https://manual.sensorsdata.cn/sa/docs/integrate_egret_sdk?search=1
 */
declare namespace sensors {
  function init(): void;
  function track(e: string, p?: object): void;
  function setPara(p: object): void;

  function login(id: string): void;
  function logout(isChangeId?: boolean): void;

  function setOnceProfile(prop: object): void;
  function setProfile(prop: object): void;

  function registerApp(prop: object): void;
  function clearAppRegister(list: Array<string>): void;
}

export default sensors;
