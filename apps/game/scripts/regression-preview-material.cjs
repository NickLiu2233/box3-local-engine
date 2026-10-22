const fs = require('node:fs'),
  path = require('node:path')
const root = path.resolve(__dirname, '../../..')
const source = fs.readFileSync(
  path.join(root, 'apps/game/components/model-preview/renderer.ts'),
  'utf8',
)
const vertex = source.match(/const vertex = `([\s\S]*?)`/)[1]
const material = fs.readFileSync(
  path.join(root, 'apps/voxa/src/models/skin-part/skin-part-mesh/frag.glsl'),
  'utf8',
)
const expression = source.split('const fragment = ')[1].split('\nconst arrowVertex')[0]
const fragment = Function('editorMaterialFragment', 'return ' + expression)(material)
const bright = fs.readFileSync(
  path.join(root, 'apps/voxa/src/models/rendering/post-process/init-brights.glsl'),
  'utf8',
)
const script = `
const vertex=${JSON.stringify(vertex)},fragment=${JSON.stringify(fragment)},bright=${JSON.stringify(bright)};
const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
const model=program(vertex,fragment),extract=program('attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}',bright);
const values=[];for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]])values.push(x,y,0,0,1,0,.5,.5);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
function attributes(p,modelMode){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,size,offset] of modelMode?[['position',3,0],['normal',3,12],['uv',2,24]]:[['position',2,0]]){const loc=gl.getAttribLocation(p,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset)}}}
gl.useProgram(model);for(const name of ['world','viewProjection'])gl.uniformMatrix4fv(gl.getUniformLocation(model,name),false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));gl.uniform1f(gl.getUniformLocation(model,'alpha'),1);gl.uniform1i(gl.getUniformLocation(model,'enableEmissive'),1);gl.uniform1i(gl.getUniformLocation(model,'palette'),0);
function texture(type,width,height){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,type,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
const half=gl.getExtension('OES_texture_half_float');gl.getExtension('EXT_color_buffer_half_float');gl.getExtension('OES_texture_float');gl.getExtension('WEBGL_color_buffer_float');
const hdr=texture(half?half.HALF_FLOAT_OES:gl.FLOAT,16,16),fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,hdr,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('HDR framebuffer unavailable');const palette=texture(gl.UNSIGNED_BYTE,1,1);
const levels=[0,25,50,75,100],rows=[];
for(const level of levels){gl.useProgram(model);attributes(model,true);gl.bindTexture(gl.TEXTURE_2D,palette);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([64,128,192,level]));gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(extract);attributes(extract,false);gl.bindTexture(gl.TEXTURE_2D,hdr);gl.uniform1i(gl.getUniformLocation(extract,'pixels'),0);gl.uniform1f(gl.getUniformLocation(extract,'blurNum'),4);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);const pixel=new Uint8Array(4);gl.readPixels(8,8,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const color=[64,128,192].map(c=>.5*(c/255)*(1.1+4*level/100));const t=Math.min(1,Math.max(0,(Math.max(...color)-1)/4)),weight=t*t*(3-2*t)/3;const expected=color.map(c=>Math.round(c*weight*255));rows.push({level,rgb:Array.from(pixel.slice(0,3)),expected});}
const pass=rows.every(row=>row.rgb.every((v,i)=>Math.abs(v-row.expected[i])<=2));document.getElementById('result').textContent=pass?'PASS':'FAIL';document.querySelector('pre').textContent=JSON.stringify(rows,null,2);document.body.dataset.result=pass?'pass':'fail';
`
fs.writeFileSync(
  path.join(root, 'apps/game/public/preview-emissive-check.html'),
  '<!doctype html><meta charset="utf-8"><title>VOXA shared shader regression</title><style>body{font:16px monospace;background:#151515;color:#ddd;padding:24px}canvas{width:64px;height:64px}pre{white-space:pre-wrap}</style><h1 id="result">RUNNING</h1><canvas width="16" height="16"></canvas><pre></pre><script>try{' +
    script +
    '}catch(e){document.getElementById("result").textContent="ERROR";document.querySelector("pre").textContent=e.stack}</script>',
)
console.log('http://127.0.0.1:3135/preview-emissive-check.html')
