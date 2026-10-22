function parse(value: string) {
  const match = value.trim().match(/^(v?)(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) throw new Error('版本号请使用 v1.0.0 这样的三段数字格式');
  return { prefix: match[1], parts: match.slice(2) };
}

export function compareVoxaPlayVersions(incoming: string, installed: string) {
  const a = parse(incoming).parts;
  const b = parse(installed).parts;
  for (let i = 0; i < 3; i++) {
    const left = a[i].replace(/^0+(?=\d)/, '');
    const right = b[i].replace(/^0+(?=\d)/, '');
    if (left.length !== right.length) return left.length < right.length ? -1 : 1;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

export function nextVoxaPlayVersion(version: string) {
  const { prefix, parts } = parse(version);
  const patch = (BigInt(parts[2]) + BigInt(1)).toString();
  const next = `${prefix}${parts[0]}.${parts[1]}.${patch}`;
  if (next.length > 50) throw new Error('版本号过长，请缩短版本号后重试');
  return next;
}
