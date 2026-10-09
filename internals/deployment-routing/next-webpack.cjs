'use strict'
const path = require('node:path')
module.exports = (config, options) => {
  for (const plugin of config.plugins || []) {
    if (plugin.definitions && Object.hasOwn(plugin.definitions,'process.env.__NEXT_ROUTER_BASEPATH')) {
      plugin.definitions['process.env.__NEXT_ROUTER_BASEPATH'] = options.isServer ? '(process.env.BOX_APP_BASE_PATH || "")' : '(window.__BOX_APP_BASE_PATH__ || "")'
    }
  }
  if (!options.isServer) {
    const aliases = config.resolve.alias
    const original = aliases['react$'] || aliases.react || require.resolve('react',{paths:[options.dir]})
    const root = original.endsWith('.js') ? path.dirname(original) : original
    aliases.__box_original_react__ = original
    aliases.__box_original_jsx_runtime__ = aliases['react/jsx-runtime'] || (root.includes('next/dist/compiled/') ? path.join(root,'jsx-runtime.js') : require.resolve('react/jsx-runtime',{paths:[options.dir]}))
    delete aliases.react
    aliases['react$'] = path.join(__dirname,'react.cjs')
    aliases['react/jsx-runtime$'] = path.join(__dirname,'jsx-runtime.cjs')
    config.plugins.push(new options.webpack.NormalModuleReplacementPlugin(/[/\\]is-local-url(?:\.js)?$/, resource => { resource.request = path.join(__dirname,'is-local-url.cjs') }))
  }
  return config
}
