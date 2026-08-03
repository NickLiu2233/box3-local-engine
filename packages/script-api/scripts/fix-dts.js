const fs = require('fs');
const path = require('path');

const fileNames = ['client-api-types.dts', 'server-api-types.dts'];

fileNames.forEach(fileName => {
  const filePath = path.resolve(__dirname, '../dts/', fileName);
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) throw err;

    let lines = data.split('\n');
    lines.splice(lines.length - 3, 2); // 删除倒数第二行和最后一行，分别是 rollup-dts 插件加的 export 和 export type，不能被 monaco 读取

    let newData = lines.join('\n');
    fs.writeFile(filePath, newData, (err) => {
      if (err) throw err;
    });
  });
})

