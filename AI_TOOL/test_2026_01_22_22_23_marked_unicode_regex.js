const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'frontend',
  'uni_modules',
  'mp-html',
  'plugins',
  'markdown',
  'marked.min.js'
);
const content = fs.readFileSync(targetPath, 'utf8');

if (/\\p\{/.test(content)) {
  console.error('发现不兼容正则 \\p{...}，App 运行环境不支持 Unicode property escapes。');
  process.exit(1);
}

console.log('未发现 \\p{...}，通过。');
