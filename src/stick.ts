import * as THREE from 'three'

const cylinderGeometry = new THREE.CylinderBufferGeometry(1, 1, 2, 12, 128)
const vertexShader = `
varying vec3 vNormal, vPosition;
uniform vec3 windMove;
uniform float phase;
varying float ttt;
const float stickR = 0.0025;
const float ballR = 0.006;
float softReLU(float x, float s) {
  return x < -s ? 0.0 : x > s ? x : 0.25 * (x + s) * (x + s) / s;
}
vec2 ballRZFunc(float t) {
  float b = sqrt(1.0 - stickR * stickR / ballR / ballR);
  float a = softReLU(t + b, 0.4) - b;
  float r = ballR * sqrt(1.0 - a * a);
  float z = -t * ballR;
  return vec2(r, z);
}
vec2 stickRZFunc(float t) {
  float rr = clamp(phase, 0.0, 0.2);
  float r = t < 1.0 - rr ? 1.0 : sqrt((1.0 - t) * (t-1.0+2.0*rr))/rr;
  return vec2(stickR * r, (-t - 2.0) * 2.3 * ballR - 2.0 * ballR);
}
vec2 rzFunc(float t) {
  return mix(stickRZFunc(t), ballRZFunc(t), phase * phase);
}
void main() {
  vec2 xy = position.zx;
  float z = position.y;
  float r;
  vNormal = normal.zxy;
  vec2 wave = vec2(0, 0);
  vec2 wavez = vec2(0, 0);
  if (z > 0.0) {
    z += ballR * 2.0;
    r = stickR;
    ttt = 0.0;
  } else {
    float t = -2.0 - 3.0 * z;
    ttt = clamp(2.0 + t, 0.0, 1.0);
    vec2 b = rzFunc(t);
    float delta = 0.01;
    vec2 db = (b - rzFunc(t-delta)) / delta;
    float dr = db.x / db.y;
    vNormal = normalize(vec3(vNormal.xy, -dr));
    r = b.x;
    z = b.y;
    float w = stickR * 6.0 * pow(phase * (1.0 - phase), 2.0) * pow(max(t+1.0, 0.0), 2.0);
    vec2 w1 = vec2(1.7, 1.9), w2 = vec2(-2.5, -3.1);
    vec2 t1 = w1 * t - 5.3 * phase, t2 = w2 * t - 3.7 * phase;
    wave = w * (sin(t1) + sin(t2));
    wavez = w * (w1 * cos(t1) + w2 * cos(t2)) / db.y;
  }
  vec2 c = 0.001 * (sin(vec2(18,17)*z)-sin(vec2(23,31)*z)+sin(vec2(35,57)*z)-sin(vec2(51,43)*z));
  vPosition = vec3(wave + r * xy + c, z - r * dot(wavez, xy)) + windMove * exp(-4.0 * z) + vec3(0, 0, dot(windMove.xy, r * xy) * 4.0 * exp(-4.0 * z));
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1);
}
`

const fragmentShader = `
varying vec3 vNormal, vPosition;
varying float ttt;
uniform float phase;
void main() {
  vec3 view = normalize(vPosition - cameraPosition);
  vec3 norm = normalize(vNormal);
  float c = max(0.0, -dot(view, norm));
  gl_FragColor.rgb = vec3(0.05) + vec3(0.4,0.2,0.1) / (1.0 + 512.0 * vPosition.z * vPosition.z);
  gl_FragColor.a = mix(c * c, sqrt(c), ttt);
  gl_FragColor.rgb = gl_FragColor.rgb + phase * vec3(2.0,1.0,0.5) * ttt;
}
`

export class Stick {
  mesh: THREE.Mesh
  windMove: THREE.Vector3
  uniforms = { windMove: { value: new THREE.Vector3 }, phase: { value: 1 } }
  constructor() {
    this.windMove = this.uniforms.windMove.value
    this.mesh = new THREE.Mesh(
      cylinderGeometry,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader,
        fragmentShader,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        depthWrite: false,
        depthTest: false
      })
    )
  }
  setPhase(phase: number) {
    this.uniforms.phase.value = phase;
  }
}
