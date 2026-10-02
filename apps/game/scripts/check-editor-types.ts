import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../..');
const editorTypes = fs.readFileSync(path.join(root, 'apps/game/src/resource/api-declarations.dts'), 'utf8');
const sdkTypes = fs.readFileSync(path.join(root, 'packages/script-api/dts/server-api-types.dts'), 'utf8');
const standaloneTypes = fs.readFileSync(path.join(root, 'packages/script-api/dts/box3-server-api.d.ts'), 'utf8');

/** Exercise the same TypeScript language service that powers Monaco, not a text search. */
class ScriptTypeProbe {
  private source = '';
  private version = 0;
  private script = path.join(root, '__script_type_probe__.js');
  private files: Record<string, string>;
  private service: ts.LanguageService;
  constructor(declarations: Record<string, string>) {
    this.files = Object.fromEntries(Object.entries(declarations).map(([name, value]) => [path.join(root, name), value]));
    const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2020, allowJs: true, checkJs: true, noEmit: true, skipLibCheck: true };
    this.service = ts.createLanguageService({
      getCompilationSettings: () => options,
      getScriptFileNames: () => [this.script, ...Object.keys(this.files)],
      getScriptVersion: file => file === this.script ? String(this.version) : '1',
      getScriptSnapshot: file => {
        const text = file === this.script ? this.source : this.files[file] ?? ts.sys.readFile(file);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getCurrentDirectory: () => root,
      getDefaultLibFileName: ts.getDefaultLibFilePath,
      fileExists: file => file === this.script || file in this.files || ts.sys.fileExists(file),
      readFile: file => this.files[file] ?? ts.sys.readFile(file),
      readDirectory: ts.sys.readDirectory,
    });
  }
  completions(code: string) {
    this.setSource(code);
    return this.service.getCompletionsAtPosition(this.script, code.length, {})?.entries.map(entry => entry.name) || [];
  }
  signature(code: string) {
    this.setSource(code);
    return this.service.getSignatureHelpItems(this.script, code.length, undefined);
  }
  diagnostics(code: string) {
    this.setSource(code);
    return this.service.getSemanticDiagnostics(this.script);
  }
  hover(code:string) {
    this.setSource(code);
    return this.service.getQuickInfoAtPosition(this.script,code.length-1);
  }
  private setSource(code: string) { this.source = code; this.version++; }
  dispose() { this.service.dispose(); }
}

// Check the editor's exact library order and the standalone downloadable SDK.
for (const [name, declarations] of [
  ['editor', { 'api.d.ts': editorTypes, 'server-api.d.ts': sdkTypes }],
  ['standalone SDK', { 'box3-server-api.d.ts': standaloneTypes }],
] as const) {
  const probe = new ScriptTypeProbe(declarations);
  try {
    const methods = probe.completions('world.moderation.');
    for (const method of ['banPlayer', 'banCurrentIP', 'revokeBan', 'getPlayerStatus', 'mapId', 'scriptFingerprint']) {
      assert.ok(methods.includes(method), `${name}: missing ${method} completion`);
    }
    const options = probe.completions('world.moderation.banPlayer(world.querySelector("player"), { ');
    for (const field of ['reason', 'durationSeconds', 'scope', 'requestId']) {
      assert.ok(options.includes(field), `${name}: missing ${field} completion`);
    }
    const signature = probe.signature('world.moderation.banPlayer(');
    assert.equal(signature?.items.length,1,`${name}: duplicate signature hints`);
    assert.ok(signature?.items[0].parameters.some(parameter => parameter.name === 'options'));
    assert.ok(probe.hover('world.moderation.banPlayer')?.documentation?.some(part=>part.text.includes('封禁')));
    assert.equal(probe.diagnostics('world.moderation.banPlayer(world.querySelector("player"), {reason:"test",durationSeconds:60,requestId:"test"});').length,0,`${name}: valid call has type errors`);
    const errors = probe.diagnostics('world.moderation.banPlayer(world.querySelector("player"), {reason: "test", durationSeconds: 60, requestId: "test", scope: "invalid"});');
    assert.ok(errors.some(error => error.code === 2322 || error.code === 2345), `${name}: invalid scope was not detected: ${JSON.stringify(errors.map(error=>({code:error.code,message:ts.flattenDiagnosticMessageText(error.messageText,' ')})))}`);
    console.log(`${name}: moderation methods, option fields, signature, Chinese documentation and scope validation passed`);
  } finally { probe.dispose(); }
}
