/**
 * 游戏数据分析相关功能模块
 * 提供神策埋点等数据分析能力
 */
var GameAnalytics = /** @class */ (function () {
    /**
     * @ignore
     * 构造函数
     */
    function GameAnalytics(
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
    sensor) {
        this.sensor = sensor;
    }
    return GameAnalytics;
}());
export { GameAnalytics };
/**
 * 神策数据埋点类
 *
 */
var GameSensorAnalytics = /** @class */ (function () {
    /**
     * @ignore
     */
    function GameSensorAnalytics(
    /**
     * 初始化埋点配置方法
     * 用于设置数据接收地址和超时时间
     * 注意: 以最后一次执行的配置为准
     *
     * @param url - 数据接收地址，神策服务器的URL
     * @param timeout - 请求超时时间，默认30秒
     */
    init, 
    /**
     * 追踪数据事件方法
     * 用于记录用户行为和自定义事件
     *
     * @param distinctId - 用户唯一标识，通常是平台用户ID(GamePlayer.userId)
     * @param eventName - 事件名称
     * @param properties - 事件属性(会被JSON.stringify序列化)
     */
    track) {
        this.init = init;
        this.track = track;
    }
    return GameSensorAnalytics;
}());
export { GameSensorAnalytics };
//# sourceMappingURL=analytics.js.map