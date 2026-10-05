import type { GamePlayer, GameEntity, GameEventChannel } from './api';

export type MovementPosition = Readonly<{ x: number; y: number; z: number }>;

/** 客户端位置修正的预应用检查，不是客户端可信的移动证明。 */
export interface GameMovementEvent {
  readonly player: GamePlayer;
  /** 服务器认可的位置快照。 */
  readonly from: MovementPosition;
  /** 客户端上报、尚未应用的候选位置。 */
  readonly to: MovementPosition;
  /** 两次服务器处理采样的间隔；不是客户端时间，也不是物理模拟时长。 */
  readonly elapsedMs: number;
  /** 服务器当前速度与客户端候选速度，使用引擎物理数值单位。 */
  readonly velocity: Readonly<{ from: MovementPosition; to: MovementPosition }>;
  readonly context: Readonly<{
    source: 'client-correction';
    inputTick: number;
    serverTick: number;
    mode: 'edit' | 'play';
    /** 同步监听回调内调用。拒绝本次位置/速度修正，保留连接和按键输入。 */
    reject: () => void;
  }>;
}

export interface GameAnticheat {
  /** 检查输入消息中的逐次主/副操作（点击、攻击、放置等），不是连续按键状态。仅服务端可用。 */
  readonly onAction: GameEventChannel<GameAnticheatActionEvent>;
  /** 连续移动控制：跳跃、奔跑、飞行等按键状态；拒绝会丢弃整个输入消息。 */
  readonly onInput: GameEventChannel<GameAnticheatInputEvent>;
  /** 键盘按下和松开的键码列表，发送者由服务器确定。 */
  readonly onKeyboard: GameEventChannel<GameAnticheatKeyboardEvent>;
  /** 玩家请求交互；target 是候选目标，不代表已通过距离等玩法校验。 */
  readonly onInteract: GameEventChannel<GameAnticheatInteractEvent>;
  /** 客户端脚本通过 remoteChannel 发送的已解析 JSON 数据。 */
  readonly onCustomEvent: GameEventChannel<GameAnticheatCustomEvent>;
  /** 自定义 GUI 按钮、表单等发来的事件名和已解析数据。 */
  readonly onUIEvent: GameEventChannel<GameAnticheatUIEvent>;
  /** 监听已认证玩家的全部游戏协议消息，在业务处理前同步决定是否拒绝。 */
  readonly onMessage: GameEventChannel<GameClientMessageEvent>;
  /**
   * 检查客户端位置修正。监听器必须同步执行，不能 await。
   * 多监听器中任意一个 reject 都会拒绝本次修正；回调异常或超时也拒绝。
   * 不监听服务端脚本传送。返回的 token 支持 cancel、resume、active。
   */
  readonly onMovement: GameEventChannel<GameMovementEvent>;
}

export type ClientMessageData = null | boolean | number | string | readonly ClientMessageData[] |
  { readonly [key: string]: ClientMessageData };

export interface GameClientMessageEvent {
  readonly player: GamePlayer;
  /** 引擎注册的协议名和消息名，非客户端自报。 */
  readonly protocol: string;
  readonly message: string;
  /** 解码后的只读副本。敏感字段被遮蔽，原始二进制只提供长度。 */
  readonly data: ClientMessageData;
  readonly unreliable: boolean;
  readonly context: Readonly<{
    source: 'client-message';
    serverTick: number;
    mode: 'edit' | 'play';
    /** 拒绝当前消息的业务处理；不踢出玩家，不修改其他玩家的数据。 */
    reject: () => void;
  }>;
}

type AnticheatContext = GameClientMessageEvent['context'];
/** 客户端候选操作，不是服务器确认的命中。距离、遮挡、冷却由地图规则验证。 */
export interface GameAnticheatAction {
  /** 客户端输入 tick，不能当作可信的服务器时间。 */
  readonly tick: number;
  readonly button: 'action0' | 'action1';
  /** 根据客户端上报的前后状态计算，不能证明物理按键确实按下。 */
  readonly pressed: boolean;
  /** 客户端自报的玩家位置；校验请使用事件的 serverPosition。 */
  readonly position: MovementPosition;
  /** 客户端声称的目标 ID，0 表示未指定实体；必须自行校验。 */
  readonly targetId: number;
  readonly ray: Readonly<{
    origin: MovementPosition;
    direction: MovementPosition;
    normal: MovementPosition;
    voxel: MovementPosition;
    /** 客户端自报的射线距离；-1 等负值表示未命中。 */
    distance: number;
  }>;
}
export interface GameAnticheatActionEvent {
  readonly player: GamePlayer;
  /** 服务端脚本当前认可的实体位置快照；不是客户端 position，也不是历史回放位置。 */
  readonly serverPosition: MovementPosition;
  /** 一条输入消息中的所有主/副操作变化，包括松开；重复操作不会被合并。 */
  readonly actions: readonly GameAnticheatAction[];
  /** reject 拒绝整条输入消息（包括移动控制），不会踢出玩家。只在同步回调内有效。 */
  readonly context: AnticheatContext;
}
export interface GameAnticheatInputEvent {
  readonly player: GamePlayer;
  /** 客户端上报的输入 tick，不能当作可信的服务器时间。 */
  readonly tick: number;
  readonly buttons: Readonly<{
    jump: boolean; walk: boolean; crouch: boolean; run: boolean; fly: boolean;
    doubleJump: boolean; action0: boolean; action1: boolean;
  }>;
  readonly context: AnticheatContext;
}
export interface GameAnticheatKeyboardEvent {
  readonly player: GamePlayer;
  /** 客户端上报的输入 tick。 */
  readonly tick: number;
  readonly pressed: readonly number[];
  readonly released: readonly number[];
  readonly context: AnticheatContext;
}
export interface GameAnticheatInteractEvent {
  readonly player: GamePlayer;
  /** 客户端上报的交互 tick。 */
  readonly tick: number;
  readonly target: GameEntity | undefined;
  readonly context: AnticheatContext;
}
export interface GameAnticheatCustomEvent {
  readonly player: GamePlayer;
  /** 客户端上报的事件 tick。 */
  readonly tick: number;
  readonly data: ClientMessageData;
  readonly context: AnticheatContext;
}
export interface GameAnticheatUIEvent {
  readonly player: GamePlayer;
  readonly name: string;
  readonly data: ClientMessageData;
  readonly context: AnticheatContext;
}
