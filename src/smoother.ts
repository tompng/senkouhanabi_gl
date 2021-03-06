import * as THREE from 'three'
import { ShaderMaterial } from 'three'

const vertexShader = `
varying vec2 coord;
uniform float delta;
void main() {
  gl_Position = vec4(2.0 * position, 1);
  coord = vec2(0.5 * (1.0 + gl_Position.x), 0.5 * (1.0 + gl_Position.y));
}
`

const randomFragmentShader = `
uniform float seed, minValue, maxValue;
void main() {
  vec4 a = vec4(1.2,3.1,2.3,2.4) * gl_FragCoord.x;
  vec4 b = vec4(2.1,1.1,1.3,3.1) * gl_FragCoord.y;
  vec4 c = vec4(3.1,2.3,1.7,1.3) * gl_FragCoord.x;
  vec4 d = vec4(1.3,2.1,2.5,3.7) * gl_FragCoord.y;
  b += sin(531.7 * a + 1.1 * seed + 1.0);
  c += sin(712.3 * b + 2.3 * seed + 2.0);
  d += sin(321.5 * a + 3.1 * seed + 3.0);
  a += sin(457.1 * d + 4.2 * seed + 4.0);
  vec4 x = sin(a + b + c + d) * 1234.5;
  gl_FragColor = minValue + (maxValue - minValue) * (x - floor(x));
}
`

const preSmoothFragmentShader = `
uniform float delta, k;
uniform sampler2D baseTexture;
varying vec2 coord;
void main() {
  vec4 sum = (
    + texture2D(baseTexture, coord + vec2(-delta, 0))
    + texture2D(baseTexture, coord + vec2(+delta, 0))
    + texture2D(baseTexture, coord + vec2(0, -delta))
    + texture2D(baseTexture, coord + vec2(0, +delta))
  ) / (1.0 + 4.0 * k);
  gl_FragColor = (texture2D(baseTexture, coord) + k * sum) / (1.0 + 4.0 * k);
}
`

const postSmoothFragmentShader = `
uniform float delta, k;
uniform sampler2D baseTexture, smoothTexture;
varying vec2 coord;
void main() {
  vec4 sum = (
    + texture2D(smoothTexture, coord + vec2(-delta, 0))
    + texture2D(smoothTexture, coord + vec2(+delta, 0))
    + texture2D(smoothTexture, coord + vec2(0, -delta))
    + texture2D(smoothTexture, coord + vec2(0, +delta))
  );
  gl_FragColor = (texture2D(baseTexture, coord) + k * sum) / (1.0 + 4.0 * k);
}
`

const diffSmoothFragmentShader = `
uniform float delta, k;
uniform sampler2D baseTexture, smoothTexture;
varying vec2 coord;
void main() {
  vec4 sum = (
    + texture2D(smoothTexture, coord + vec2(-delta, 0))
    + texture2D(smoothTexture, coord + vec2(+delta, 0))
    + texture2D(smoothTexture, coord + vec2(0, -delta))
    + texture2D(smoothTexture, coord + vec2(0, +delta))
  );
  gl_FragColor = texture2D(baseTexture, coord) + 0.25 * k * sum - (1.0 + k) * texture2D(smoothTexture, coord);
}
`

const copyDownFragmentShader = `
uniform float delta;
uniform sampler2D baseTexture;
varying vec2 coord;
void main() {
  gl_FragColor = 0.25 * (
    + texture2D(baseTexture, coord + vec2(-delta, -delta))
    + texture2D(baseTexture, coord + vec2(-delta, +delta))
    + texture2D(baseTexture, coord + vec2(+delta, -delta))
    + texture2D(baseTexture, coord + vec2(+delta, +delta))
  );
}
`

const copyFragmentShader = `
uniform sampler2D baseTexture;
varying vec2 coord;
void main() {
  gl_FragColor = texture2D(baseTexture, coord);
}
`

const wsumFragmentShader = `
uniform sampler2D texture1, texture2;
uniform float weight1, weight2;
varying vec2 coord;
void main() {
  gl_FragColor = weight1 * texture2D(texture1, coord) + weight2 * texture2D(texture2, coord);
}
`

function linear(t: THREE.Texture) {
  t.minFilter = t.magFilter = THREE.LinearFilter
  return t
}

function nearest(t: THREE.Texture) {
  t.minFilter = t.magFilter = THREE.NearestFilter
  return t
}

const shaderOptions = { blending: THREE.NoBlending }
export class Smoother {
  preSmoothShader = new ShaderMaterial({ vertexShader, fragmentShader: preSmoothFragmentShader, ...shaderOptions })
  postSmoothShader = new ShaderMaterial({ vertexShader, fragmentShader: postSmoothFragmentShader, ...shaderOptions })
  diffSmoothShader = new ShaderMaterial({ vertexShader, fragmentShader: diffSmoothFragmentShader, ...shaderOptions })
  copyShader = new ShaderMaterial({ vertexShader, fragmentShader: copyFragmentShader, ...shaderOptions })
  copyDownShader = new ShaderMaterial({ vertexShader, fragmentShader: copyDownFragmentShader, ...shaderOptions })
  wsumShader = new ShaderMaterial({ vertexShader, fragmentShader: wsumFragmentShader, ...shaderOptions })
  randomShader = new ShaderMaterial({ vertexShader, fragmentShader: randomFragmentShader, ...shaderOptions })
  renderTargets: Record<string, THREE.WebGLRenderTarget | undefined> = {}
  plane = new THREE.Mesh(new THREE.PlaneBufferGeometry())
  camera = new THREE.Camera()
  scene = new THREE.Scene()
  constructor(public renderer: THREE.WebGLRenderer, public size: number, public type: THREE.TextureDataType = THREE.HalfFloatType, public wrap: THREE.Wrapping = THREE.RepeatWrapping) {
    this.scene.add(this.plane)
  }
  randomize(target: THREE.WebGLRenderTarget, range?: { min: number; max: number }) {
    const renderTargetWas = this.renderer.getRenderTarget()
    this._render(this.randomShader, target, { seed: Math.random(), minValue: range?.min ?? 0, maxValue: range?.max ?? 1 })
    this.renderer.setRenderTarget(renderTargetWas)
  }
  smooth(input: THREE.Texture, k: number, output?: THREE.WebGLRenderTarget) {
    if (!output) output = this.getRenderTarget('output', this.size)
    const minFilterWas = input.minFilter
    const magFilterWas = input.magFilter
    const renderTargetWas = this.renderer.getRenderTarget()
    const tmp = this.getRenderTarget('tmp', this.size)
    this._smooth(input, output, tmp, k, 0)
    this._smooth(input, output, tmp, k, 0, { multiPass: true })
    input.minFilter = minFilterWas
    input.magFilter = magFilterWas
    this.renderer.setRenderTarget(renderTargetWas)
    return output.texture
  }
  smooth2(input: THREE.Texture, k: number, output?: THREE.WebGLRenderTarget) {
    const renderTargetWas = this.renderer.getRenderTarget()
    const o1 = this.getRenderTarget('smooth1output', this.size)
    const o2 = this.getRenderTarget('smooth2output', this.size)
    if (!output) output = this.getRenderTarget('output', this.size)
    this.smooth(input, k, o1)
    this.smooth(input, 2 * k, o2)
    this._render(this.wsumShader, output, { texture1: nearest(o1.texture), texture2: nearest(o2.texture), weight1: -1, weight2: 2 })
    this.renderer.setRenderTarget(renderTargetWas)
    return output.texture
  }
  _render(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget, uniforms: Record<string, THREE.Texture | number>) {
    for (const key in uniforms) material.uniforms[key] = { value: uniforms[key] }
    material.uniforms
    this.plane.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }
  _smooth(input: THREE.Texture, output: THREE.WebGLRenderTarget, tmp: THREE.WebGLRenderTarget, k: number, step: number, option?: { multiPass?: boolean; useInitial?: boolean }) {
    const size = this.size >> step
    const delta = 1 / (size - 1)
    if (option?.multiPass) {
      this._render(this.postSmoothShader, tmp, { k, delta, baseTexture: nearest(input), smoothTexture: nearest(output.texture)})
    } else {
      this._render(this.preSmoothShader, tmp, { k, delta, baseTexture: nearest(input) })
    }
    if (size > 4 && size % 2 == 0) {
      const i2 = this.getRenderTarget(`i${step}`, size / 2)
      const o2 = this.getRenderTarget(`o${step}`, size / 2)
      const t2 = this.getRenderTarget(`t${step}`, size / 2)
      const delta2 = 1 / (size / 2 - 1) / 4
      this._render(this.copyDownShader, o2, { delta: delta2, baseTexture: linear(input) })
      this._render(this.copyDownShader, t2, { delta: delta2, baseTexture: linear(tmp.texture)})
      this._render(this.diffSmoothShader, i2, { k, delta: 1 / (size / 2 - 1), smoothTexture: nearest(t2.texture), baseTexture: nearest(o2.texture) })
      this._smooth(i2.texture, o2, t2, k / 4, step + 1)
      const tmp2 = this.getRenderTarget(`t2_${step}`, size)
      this._render(this.wsumShader, tmp2, { texture1: linear(o2.texture), texture2: linear(tmp.texture), weight1: 1, weight2: 1 })
      this._render(this.postSmoothShader, output, { k, delta, baseTexture: nearest(input), smoothTexture: nearest(tmp2.texture)})
    } else {
      this._render(this.postSmoothShader, output, { k, delta, baseTexture: nearest(input), smoothTexture: nearest(tmp.texture)})
    }
  }
  createRenderTarget(size: number) {
    const option: THREE.WebGLRenderTargetOptions = {
      type: this.type,
      wrapS: this.wrap,
      wrapT: this.wrap,
      depthBuffer: false,
      stencilBuffer: false
    }
    return new THREE.WebGLRenderTarget(size, size, option)
  }
  getRenderTarget(id: string, size: number) {
    const rt = this.renderTargets[id]
    if (rt) return rt
    const renderTarget = this.createRenderTarget(size)
    this.renderTargets[id] = renderTarget
    return renderTarget
  }

  dispose() {
    this.copyShader.dispose()
    this.copyDownShader.dispose()
    this.preSmoothShader.dispose()
    this.postSmoothShader.dispose()
    this.diffSmoothShader.dispose()
    this.wsumShader.dispose()
    this.randomShader.dispose()
    Object.values(this.renderTargets).forEach(t => t?.dispose())
  }
}


function calcError(n: number, k: number, f: number[][], g: number[][]) {
  let error = 0
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = f[(i + n - 1) % n][j] + f[(i + 1) % n][j]+ f[i][(j + n - 1) % n] + f[i][(j + 1) % n]
    const e = (1 + 4 * k) * f[i][j] - k * sum - g[i][j]
    error += e * e
  }
  return Math.sqrt(error / f.length)
}
function array2D(n: number, c: number = 0) {
  return [...new Array(n)].map(() => new Array(n).fill(c))
}

function solve(n: number, k: number, output: number[][], g: number[][], tmp: number[][]) {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = (
      g[(i + n - 1) % n][j] + g[(i + 1) % n][j]+ g[i][(j + n - 1) % n] + g[i][(j + 1) % n]
    ) / (1 + 4 * k)
    tmp[i][j] = (g[i][j] + k * sum) / (1 + 4 * k)
  }
  if (n > 4 && n % 2 === 0) {
    const n2 = n / 2
    const g2 = array2D(n2)
    const o2 = array2D(n2)
    const t2 = array2D(n2)
    for (let i = 0; i < n2; i++) for (let j = 0; j < n2; j++) {
      const ia = (2 * i - 1 + n) % n, ib = (2 * i + 1) % n
      const ja = (2 * j - 1 + n) % n, jb = (2 * j + 1) % n
      g2[i][j] = (
        + g[ia][ja] + 2 * g[ia][2 * j] + g[ia][jb]
        + 2 * g[2 * i][ja] + 4 * g[2 * i][2 * j] + 2 * g[2 * i][jb]
        + g[ib][ja] + 2 * g[ib][2 * j] + g[ib][jb]
      ) / 16
      t2[i][j] = (
        + tmp[ia][ja] + 2 * tmp[ia][2 * j] + tmp[ia][jb]
        + 2 * tmp[2 * i][ja] + 4 * tmp[2 * i][2 * j] + 2 * tmp[2 * i][jb]
        + tmp[ib][ja] + 2 * tmp[ib][2 * j] + tmp[ib][jb]
      ) / 16
    }
    for (let i = 0; i < n2; i++) for (let j = 0; j < n2; j++) {
      const sum = t2[(i + n2 - 1) % n2][j] + t2[(i + 1) % n2][j]+ t2[i][(j + n2 - 1) % n2] + t2[i][(j + 1) % n2]
      g2[i][j] += k * sum / 4 - (1 + k) * t2[i][j]
    }
    solve(n / 2, k / 4, o2, g2, t2)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const ia = Math.floor(i / 2), ib = Math.floor((i + 1) / 2) % (n / 2)
      const ja = Math.floor(j / 2), jb = Math.floor((j + 1) / 2) % (n / 2)
      tmp[i][j] += (o2[ia][ja] + o2[ia][jb] + o2[ib][ja] + o2[ib][jb]) / 4
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = tmp[(i + n - 1) % n][j] + tmp[(i + 1) % n][j]+ tmp[i][(j + n - 1) % n] + tmp[i][(j + 1) % n]
    output[i][j] = (g[i][j] + k * sum) / (1 + 4 * k)
  }
}

function show(n: number, array: number[][]) {
  const min = Math.min(...array.map(a => Math.min(...a)))
  const max = Math.max(...array.map(a => Math.max(...a)))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n
  const ctx = canvas.getContext('2d')!
  const imgdata = ctx.createImageData(n, n)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const idx = 4 * (n * j + i)
    imgdata.data[idx + 0] = imgdata.data[idx + 1] = imgdata.data[idx + 2] = 0xff * (array[i][j] - min) / (max - min)
    imgdata.data[idx + 3] = 0xff
  }
  ctx.putImageData(imgdata, 0, 0)
  document.body.appendChild(canvas)
}

function smooth(n: number, k: number, f: number[][]) {
  const arr1 = array2D(n)
  const arr2 = array2D(n)
  const tmp = array2D(n)
  solve(n, k, arr1, f, tmp)
  console.log(calcError(n, k, arr1, f))
  solve(n, 2 * k, arr2, f, tmp)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) arr2[i][j] = 2 * arr2[i][j] - arr1[i][j]
  return arr2
}

export function smoothtest() {
  const N = 512
  const K = N / 4
  const col = array2D(N)
  const boke = array2D(N, 3.9)
  function inCircle(x: number, y: number, r: number, i: number, j: number) {
    return (i - x) ** 2 + (j - y) ** 2 < r ** 2
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    for (let k = 0; k <= 10; k++) {
      if (inCircle(N * (0.8 - 0.6 * k / 10), N * (0.4 + 0.2 * (k % 2)), N * 0.2, i, j)) {
        col[i][j] = 0.5 + 0.2 * (k % 2)  + 0.15 * (k % 3) + 0.3 * (k % 5)
        boke[i][j] = (5 - k) * 3.5 / 5.0
        break
      }
    }
  }
  const k = 0.5
  show(N, col)
  const boke2 = smooth(N, 4, boke)
  const c1_ = smooth(N, 1 * k, col)
  const c2_ = smooth(N, 4 * k, col)
  const c3_ = smooth(N, 9 * k, col)
  const c4_ = smooth(N, 16 * k, col)
  const col2 = array2D(N)
  const cols = [col, c1_, c2_, c3_, c4_]
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const bb = Math.max(Math.abs(boke[i][j]), Math.abs(boke2[i][j]))
    const b = Math.min(Math.abs(bb), 3.9)
    const bi = Math.floor(b), bf = b - bi
    col2[i][j] = cols[bi][i][j] * (1 - bf) + bf * cols[bi + 1][i][j]
  }
  show(N, col2)
}
