import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 打包成一个独立的 dist/index.html，脚本与样式全部内联
export default defineConfig({
  plugins: [solid(), viteSingleFile()],
  build: { target: 'es2019', cssTarget: 'chrome80' },
});
