import * as THREE from 'three'
import { isWireFrame } from './setting'

const vertexShader = `
uniform float time;
uniform vec4 seed;
uniform vec3 center, direction;
varying vec3 vPosition, vNormal;
varying float vT;
const float pi = 3.1415926535;
vec3 pos(float len, vec3 axis0, vec3 axis1, vec3 axis2, vec2 xy, float t) {
  float th = clamp(t, -1.0, 1.0) * pi * 0.5;
  vec3 p = sin(th) * axis0 + 0.4 * cos(th) * (axis1 * xy.x + axis2 * xy.y);
  float size = 1.0 + 0.2 * (sin((6.3 + seed.x) * time + seed.y) + sin((4.3 + seed.z) * time + seed.w));
  float th1 = (2.0 + 2.0 * seed.x) * t - (6.0 + 9.0 * seed.z) * time + 3.14 * seed.y;
  float th2 = (2.0 + 2.0 * seed.y) * t - (7.0 + 8.0 * seed.w) * time + 3.14 * seed.z;
  float th3 = (2.0 + 2.0 * seed.z) * t - (8.0 + 7.0 * seed.x) * time + 3.14 * seed.w;
  float th4 = (2.0 + 2.0 * seed.w) * t - (9.0 + 6.0 * seed.y) * time + 3.14 * seed.x;
  vec3 noize = (t + 1.0) * 0.02 * (
    + axis1 * cos(th1) + axis2 * sin(th1)
    + axis1 * cos(th2) + axis2 * sin(th2)
    + axis1 * cos(th3) + axis2 * sin(th3)
    + axis1 * cos(th4) + axis2 * sin(th4)
  );
  return len * (axis0 + p + noize) * 0.5;
}

void main() {
  float len = length(direction);
  vec3 axis0 = direction / len;
  vec3 axis1 = normalize(cross(vec3(1, 2, 0), axis0));
  vec3 axis2 = cross(axis0, axis1);
  vec2 xy = normalize(position.zx);
  float t = position.y;
  vPosition = center + pos(len, axis0, axis1, axis2, xy, t);
  float delta = 0.01;
  vec3 lt = pos(len, axis0, axis1, axis2, xy, t + delta) - pos(len, axis0, axis1, axis2, xy, t - delta);
  vec2 dxy = vec2(xy.y, -xy.x) * delta;
  float clampt = clamp(t, -0.99, 0.99);
  vec3 lxy = pos(len, axis0, axis1, axis2, normalize(xy + dxy), clampt) - pos(len, axis0, axis1, axis2, normalize(xy - dxy), clampt);
  vNormal = normalize(cross(lt, lxy));
  vT = t;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1);
}
`

const fragmentShader = `
uniform float brightness;
varying vec3 vPosition, vNormal;
varying float vT;
void main() {
  float c = dot(normalize(vPosition - cameraPosition), normalize(vNormal));
  gl_FragColor.rgb = 1.0 * c * c * c * c * brightness * (1.0 - vT) * vec3(4, 2, 1);
  gl_FragColor.a = 1.0;
}
`

const geometry = new THREE.CylinderBufferGeometry(1, 1, 2, 16, 16)

export class Fire {
  uniforms = {
    seed: { value: new THREE.Vector4(Math.random(), Math.random(), Math.random(), Math.random()) },
    center: { value: new THREE.Vector3() },
    direction: { value: new THREE.Vector3() },
    brightness: { value: 1 },
    time: { value: 0 }
  }
  readonly center: THREE.Vector3
  readonly direction: THREE.Vector3
  readonly mesh: THREE.Mesh
  readonly material: THREE.ShaderMaterial
  constructor() {
    this.center = this.uniforms.center.value
    this.direction = this.uniforms.direction.value
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader: isWireFrame ? 'void main(){gl_FragColor=vec4(0.15);}' : fragmentShader,
      wireframe: isWireFrame,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    this.mesh = new THREE.Mesh(geometry, this.material)
  }
  dispose() {
    this.material.dispose()
  }
  get brightness() {
    return this.uniforms.brightness.value
  }
  set brightness(brightness: number) {
    this.uniforms.brightness.value = brightness
  }
  get time() {
    return this.uniforms.time.value
  }
  set time(time: number) {
    this.uniforms.time.value = time
  }
}
