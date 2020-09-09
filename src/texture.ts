import * as THREE from 'three'
import { Smoother } from './smoother'
import { Mesh } from 'three'

const vertexShader = `
varying vec2 coord;
void main() {
  gl_Position = vec4(2.0 * position, 1);
  coord = vec2(0.5 * (1.0 + gl_Position.x), 0.5 * (1.0 + gl_Position.y));
}
`

const fragmentShader = `
varying vec2 coord;
uniform sampler2D smoothTexture, noizeTexture;
const float wn = 4.0;
const float hn = 8.0;
void main() {
  float yi = floor(coord.y * hn);
  float yoffset = yi / hn;
  float yrnd = mod(64.0 * sin(yi * 160.0), 1.0);
  float xoffset = (mod(yi, 2.0) + yrnd * 0.5) / wn / 2.0;
  float xi = mod(floor((coord.x - xoffset) * wn) + 0.5, wn) - 0.5;
  vec2 p = mod((coord - vec2(xoffset, yoffset)) * vec2(wn, hn), vec2(1));
  float h1 = min(16.0 * p.x * (1.0 - p.x), 1.0) * min(8.0 * p.y * (1.0 - p.y), 1.0);
  vec4 smt = texture2D(smoothTexture, coord + mat2(0.13,0.37,-0.23,0.41) * vec2(xi, yi));
  p += min(h1 * 16.0, 0.3) * smt.xy * vec2(1, 2);
  float h2 = min(32.0 * p.x * (1.0 - p.x), 1.0) * min(16.0 * p.y * (1.0 - p.y), 1.0) - 0.5;
  float z = h2 * (1.0 + 128.0 * smt.z * smt.z);
  vec2 c1 = texture2D(noizeTexture, coord + mat2(0.31,0.27,-0.41,0.29) * vec2(xi, yi)).xy;
  vec2 c2 = texture2D(noizeTexture, coord).xy;
  gl_FragColor.xyz = h2 < 0.0
    ? vec3(0.5) + vec3(1) * c2.x
    : vec3(0.4) + vec3(2,1,1) * c1.x + vec3(0,1,1) * c1.y * c1.y + vec3(0.2) * (mod(987.6 * sin(123.4 * xi + 567.8 * yi), 1.0) - 0.5);
  gl_FragColor.a = z;
}
`

const stoneTextureShader = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader
})

const raytraceFragmentShader = `
varying vec2 coord;
uniform sampler2D stoneTexture;
const vec3 camera = vec3(0, 0, 0.2);
const float stoneHeightScale = 0.005;
const float stoneMaxHeight = 0.006;
const float PI = 3.1415926535;
uniform float baseLight;
uniform float fireLight;
void main() {
  vec2 vxy = vec2(2.0 * coord.x - 1.0, 2.0 * coord.y - 1.0);
  float vlen = length(vxy);
  float vth = vlen * PI / 2.0;
  vec3 view = vec3(vxy.x * sin(vth) / vlen, cos(vth), vxy.y * sin(vth) / vlen);
  float tmin = (stoneMaxHeight - camera.z) / view.z;
  float tmax = - camera.z / view.z;
  if (view.z >= 0.0 || view.y * tmax > 1.0) {
    float h1 = 0.2 * texture2D(stoneTexture, vec2(0.2 * view.x, 0.3)).r + texture2D(stoneTexture, vec2(0.2 + 0.01 * view.x, 0.4)).r - 0.4;
    float h2 = 0.2 * texture2D(stoneTexture, vec2(0.2 * view.x, 0.5)).r + texture2D(stoneTexture, vec2(0.2 + 0.01 * view.x, 0.6)).r - 0.3;


    if (view.z < h1) {
      gl_FragColor = vec4(0.06,0.08,0.06,1);
    } else if (view.z < h2) {
      gl_FragColor = vec4(0.04,0.06,0.04,1);
    } else {
      gl_FragColor = vec4(0.2,0.2,0.3,1) * (2.0 - 0.2 * view.x - view.z);
    }
    gl_FragColor *= baseLight;
    gl_FragColor.a = 1.0;
    return;
  }
  vec2 p0 = camera.xy + view.xy * tmin;
  vec2 p1 = camera.xy + view.xy * tmax;
  float tu = tmax;
  for (float i = 0.0; i < 1.0; i+= 0.1) {
    float t = tmin + (tmax - tmin) * i;
    vec3 p = camera + view * t;
    vec4 v = texture2D(stoneTexture, p.xy);
    if (p.z < stoneHeightScale * v.a - max(p.y-1.0, 0.0)) {
      tu = t;
      break;
    }
  }
  float t;
  if (tu == tmax && false) {
    t = tmax;
  } else {
    tmax = tu;
    float ta = tmin;
    float tb = tmax;
    vec4 v;
    for (int i = 0; i < 20; i++) {
      float _t = (ta + tb) * 0.5;
      vec3 p = camera + view * _t;
      v = texture2D(stoneTexture, p.xy);
      if (p.z > stoneHeightScale * v.a - max(p.y-1.0, 0.0)) {
        ta = _t;
      } else {
        tb = _t;
      }
    }
    t = (ta + tb) * 0.5;
  }
  vec3 p = camera + view * t;
  vec4 v = texture2D(stoneTexture, p.xy);
  float d = 1.0 / 1024.0;
  float hx = stoneHeightScale * (texture2D(stoneTexture, p.xy + vec2(d, 0)).a - texture2D(stoneTexture, p.xy - vec2(d, 0)).a) / d;
  float hy = stoneHeightScale * (texture2D(stoneTexture, p.xy + vec2(0, d)).a - texture2D(stoneTexture, p.xy - vec2(0, d)).a) / d;
  vec3 norm = v.a < 0.0 ? vec3(0, 0, 1) : normalize(vec3(-hx, -hy, 1));
  vec3 sphereLight = p - camera;
  gl_FragColor.rgb = v.rgb * max(-dot(norm, normalize(sphereLight)), 0.0) / dot(sphereLight, sphereLight) * vec3(0.32, 0.16, 0.08) * fireLight;
  vec3 light = normalize(vec3(0,0,1));
  gl_FragColor.rgb += v.rgb * max(dot(norm, light), 0.0) * 0.5 * baseLight;
  gl_FragColor.a = 1.0;
}
`

const raytraceShader = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader: raytraceFragmentShader
})

const mixFragmentShader = `
varying vec2 coord;
uniform sampler2D t1, t2, t3;
const vec3 camera = vec3(0, 0, 0.2);
const float PI = 3.1415926535;
void main() {
  vec2 vxy = vec2(2.0 * coord.x - 1.0, 2.0 * coord.y - 1.0);
  float vlen = length(vxy);
  float vth = vlen * PI / 2.0;
  vec3 view = vec3(vxy.x * sin(vth) / vlen, cos(vth), vxy.y * sin(vth) / vlen);
  float maxd = camera.z + 1.0;
  float distance = view.z >= 0.0 ? maxd : min(maxd, -camera.z / view.z);
  float t = (distance - camera.z) / (maxd - camera.z);
  t = 2.0 * t;
  vec4 c1 = texture2D(t1, coord);
  vec4 c2 = texture2D(t2, coord);
  vec4 c3 = texture2D(t3, coord);
  gl_FragColor = t < 1.0 ? mix(c1, c2, t) : mix(c2, c3, t - 1.0);
}
`

const mixShader = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader: mixFragmentShader
})

const scene = new THREE.Scene()
const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry())
scene.add(plane)
function render(renderer: THREE.WebGLRenderer, shader: THREE.ShaderMaterial, uniforms: Record<string, THREE.Texture | number>) {
  for (const name in uniforms) shader.uniforms[name] = { value: uniforms[name] }
  plane.material = shader
  renderer.render(scene, new THREE.Camera())
}

export function createTextures(renderer: THREE.WebGLRenderer) {
  const size = 1024
  const smoother = new Smoother(renderer, size)
  const randomTarget = smoother.createRenderTarget(size)
  const noizeTarget = smoother.createRenderTarget(size)
  const smoothTarget = smoother.createRenderTarget(size)
  smoother.randomize(randomTarget, { min: -1, max: +1 })
  const noize = smoother.smooth(randomTarget.texture, 8, noizeTarget)
  smoother.randomize(randomTarget, { min: -1, max: +1 })
  const smooth = smoother.smooth2(randomTarget.texture, 8, smoothTarget)
  smooth.minFilter = smooth.magFilter = THREE.LinearFilter
  noize.minFilter = noize.magFilter = THREE.LinearFilter
  const renderTargetWas = renderer.getRenderTarget()
  const stone = smoother.createRenderTarget(size)
  renderer.setRenderTarget(stone)
  render(renderer, stoneTextureShader, { smoothTexture: smooth, noizeTexture: noize })

  stone.texture.minFilter = stone.texture.magFilter = THREE.LinearFilter
  const tmpoutput = smoother.createRenderTarget(size)
  const outputBase = smoother.createRenderTarget(size)
  const outputLight = smoother.createRenderTarget(size)
  const outputs = [outputBase, outputLight]
  const tmp1 = smoother.createRenderTarget(size)
  const tmp2 = smoother.createRenderTarget(size)
  const tmp3 = smoother.createRenderTarget(size)
  for (let i = 0; i < 2; i++) {
    renderer.setRenderTarget(tmpoutput)
    render(renderer, raytraceShader, { stoneTexture: stone.texture, baseLight: 1 - i, fireLight: i })
    const output = outputs[i]
    smoother.smooth2(tmpoutput.texture, 2, tmp1)
    smoother.smooth2(tmpoutput.texture, 8, tmp2)
    smoother.smooth2(tmpoutput.texture, 32, tmp3)
    renderer.setRenderTarget(output)
    render(renderer, mixShader, { t1: tmp1.texture, t2: tmp2.texture, t3: tmp3.texture })
    output.texture.minFilter = output.texture.magFilter = THREE.LinearFilter
  }
  renderer.setRenderTarget(renderTargetWas)
  ;[smoother, randomTarget, noizeTarget, smoothTarget, tmpoutput, tmp1, tmp2].forEach(o => o.dispose())
  return [outputBase.texture, outputLight.texture] as const
}

const envVertexShader = `
varying vec2 texCoord;
void main() {
  texCoord = (vec2(1) + position.xy) / 2.0;
  float r = length(position.xy);
  float th = r * 3.1415926535 / 2.0;
  if (r == 0.0) r = 1.0;
  vec3 a = vec3(position.x, 0, position.y) * sin(th) / r + vec3(0, cos(th), 0);
  gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + a, 1);
}
`

const envFragmentShader = `
uniform sampler2D baseTexture, lightTexture;
uniform float baseValue, lightValue;
varying vec2 texCoord;
void main() {
  gl_FragColor = baseValue * texture2D(baseTexture, texCoord) + lightValue * texture2D(lightTexture, texCoord);
  gl_FragColor.a = 1.0;
}
`

export class Environment {
  uniforms = {
    baseTexture: { value: null as THREE.Texture | null },
    lightTexture: { value: null as THREE.Texture | null },
    baseValue: { value: 1 },
    lightValue: { value: 1 }
  }
  mesh: THREE.Mesh
  constructor(base: THREE.Texture, light: THREE.Texture) {
    const geometry = new THREE.PlaneBufferGeometry(2, 2, 64, 64)
    this.uniforms.baseTexture.value = base
    this.uniforms.lightTexture.value = light
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: envVertexShader,
      fragmentShader: envFragmentShader,
      depthTest: false,
      depthWrite: false
    })
    this.mesh = new Mesh(geometry, material)
  }
  set(base: number, light: number) {
    this.uniforms.baseValue.value = base
    this.uniforms.lightValue.value = light
  }
}
