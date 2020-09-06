import * as THREE from 'three'
import { Smoother } from './smoother'

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
  float xi = floor((coord.x - xoffset) * wn);
  vec2 p = mod((coord - vec2(xoffset, yoffset)) * vec2(wn, hn), vec2(1));
  float h1 = min(16.0 * p.x * (1.0 - p.x), 1.0) * min(8.0 * p.y * (1.0 - p.y), 1.0);
  vec4 smt = texture2D(smoothTexture, coord + mat2(0.13,0.37,-0.23,0.41) * vec2(xi, yi));
  p += min(h1 * 16.0, 0.3) * smt.xy * vec2(1, 2);
  float h2 = min(32.0 * p.x * (1.0 - p.x), 1.0) * min(16.0 * p.y * (1.0 - p.y), 1.0) - 0.5;
  float z = h2 * (1.0 + 512.0 * smt.z * smt.z);
  vec2 c1 = texture2D(noizeTexture, coord * 0.4 + mat2(0.31,0.27,-0.41,0.29) * vec2(xi, yi)).xy;
  vec2 c2 = texture2D(noizeTexture, coord).xy;
  gl_FragColor.xyz = h2 < 0.0
    ? vec3(0.5) + vec3(1) * c2.x
    : vec3(0.4) + vec3(1.2,1,1) * c1.x + vec3(0,2,2) * c1.y * c1.y;
  gl_FragColor.a = z;
}
`

const stoneTextureShader = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader
})

const scene = new THREE.Scene()
const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry())
scene.add(plane)
function render(renderer: THREE.WebGLRenderer, shader: THREE.ShaderMaterial, uniforms: Record<string, THREE.Texture>) {
  for (const name in uniforms) shader.uniforms[name] = { value: uniforms[name] }
  plane.material = shader
  renderer.render(scene, new THREE.Camera())
}

export function createTexture(renderer: THREE.WebGLRenderer) {
  const size = 1024
  const smoother = new Smoother(renderer, size)
  const randomTarget = smoother.createRenderTarget(size)
  const noizeTarget = smoother.createRenderTarget(size)
  const smoothTarget = smoother.createRenderTarget(size)
  smoother.randomize(randomTarget, { min: -1, max: +1 })
  const noize = smoother.smooth(randomTarget.texture, 8, noizeTarget)
  smoother.randomize(randomTarget, { min: -1, max: +1 })
  const smooth = smoother.smooth2(randomTarget.texture, 8, smoothTarget)
  const renderTargetWas = renderer.getRenderTarget()
  const output = smoother.createRenderTarget(size)
  renderer.setRenderTarget(output)
  render(renderer, stoneTextureShader, { smoothTexture: smooth, noizeTexture: noize })
  renderer.setRenderTarget(renderTargetWas)
  smoother.dispose()
  ;[smoother, randomTarget, noizeTarget, smoothTarget].forEach(o => o.dispose())
  return output.texture
}
