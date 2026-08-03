/**
 * 游戏数据分析相关功能模块
 * 提供神策埋点等数据分析能力
 */
export declare class GameAnalytics {
    /**
     * 神策埋点实例
     * @example
     * const sa = analytics.sensor;
     * world.onPlayerJoin(({ entity }) => {
     *    console.log(entity.player.userId)
     *    // 初始化神策配置
     *    sa.init('https://shence-data.XXX.cn/sa?project=XXX&token=XXX')
     *    // 追踪一个测试事件
     *    sa.track(entity.player.userId, 'test', { n: 3, s: 'string', b: true, d: Date.now() })
     * })
     */
    sensor: GameSensorAnalytics;
    /**
     * @ignore
     * 构造函数
     */
    constructor(
    /**
     * 神策埋点实例
     * @example
     * const sa = analytics.sensor;
     * world.onPlayerJoin(({ entity }) => {
     *    console.log(entity.player.userId)
     *    // 初始化神策配置
     *    sa.init('https://shence-data.XXX.cn/sa?project=XXX&token=XXX')
     *    // 追踪一个测试事件
     *    sa.track(entity.player.userId, 'test', { n: 3, s: 'string', b: true, d: Date.now() })
     * })
     */
    sensor: GameSensorAnalytics);
}
/**
 * 神策数据埋点类
 *
 */
export declare class GameSensorAnalytics {
    /**
     * 初始化埋点配置方法
     * 用于设置数据接收地址和超时时间
     * 注意: 以最后一次执行的配置为准
     *
     * @param url - 数据接收地址，神策服务器的URL
     * @param timeout - 请求超时时间，默认30秒
     */
    init: (url: string, timeout?: number) => void;
    /**
     * 追踪数据事件方法
     * 用于记录用户行为和自定义事件
     *
     * @param distinctId - 用户唯一标识，通常是平台用户ID(GamePlayer.userId)
     * @param eventName - 事件名称
     * @param properties - 事件属性(会被JSON.stringify序列化)
     */
    track: (distinctId: string, eventName: string, properties?: Record<string, number | string | boolean>) => void;
    /**
     * @ignore
     */
    constructor(
    /**
     * 初始化埋点配置方法
     * 用于设置数据接收地址和超时时间
     * 注意: 以最后一次执行的配置为准
     *
     * @param url - 数据接收地址，神策服务器的URL
     * @param timeout - 请求超时时间，默认30秒
     */
    init: (url: string, timeout?: number) => void, 
    /**
     * 追踪数据事件方法
     * 用于记录用户行为和自定义事件
     *
     * @param distinctId - 用户唯一标识，通常是平台用户ID(GamePlayer.userId)
     * @param eventName - 事件名称
     * @param properties - 事件属性(会被JSON.stringify序列化)
     */
    track: (distinctId: string, eventName: string, properties?: Record<string, number | string | boolean>) => void);
}
/**
 * 数据分析模块的全局实例
 * 用于访问游戏中的数据分析功能
 */
export declare const analytics: GameAnalytics;
//# sourceMappingURL=analytics.d.ts.map