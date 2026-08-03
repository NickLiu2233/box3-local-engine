import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';

// node 16.15以下需要这段 workaround，升级镜像后可以换回标准的import
import { createRequire } from 'module'; // Bring in the ability to create the 'require' method
const r = createRequire(import.meta.url); // construct the require method
const pkg = r('./package.json'); // use the require method

export default defineConfig([
  {
    input: './src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        indent: false,
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: 'es',
        indent: false,
        sourcemap: true,
      },
    ],
    external: ['fs', 'path', 'ajv/dist/jtd', ...Object.keys(pkg.dependencies)],
    plugins: [typescript(), commonjs()],
  },
  {
    input: './src/constants.ts',
    output: [
      {
        file: 'dist/constants.js',
        format: 'cjs',
        indent: false,
        sourcemap: true,
      },
      {
        file: 'dist/constants.es.js',
        format: 'es',
        indent: false,
        sourcemap: true,
      },
    ],
    external: ['fs', 'path', 'ajv/dist/jtd', ...Object.keys(pkg.dependencies)],
    plugins: [typescript(), commonjs()],
  },
]);
