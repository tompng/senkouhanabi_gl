import * as THREE from 'three'
const geometry = new THREE.SphereBufferGeometry(0.006, 32, 32)

const vertexShader = `
uniform float time;
varying vec3 vPosition, vNormal, aa;
varying float cc;
void main() {
  vNormal = normal;
  vec3 a = (
    + sin(6.23 * normal.xyz - 4.21 * normal.yzx + 15.27 * time)
    + sin(5.18 * normal.yzx - 5.31 * normal.zxy + 13.33 * time)
    + sin(4.71 * normal.zxy - 6.16 * normal.xyz + 17.51 * time)
    + sin(2.37 * normal.xyz + 4.31 * normal.yzx + 9.17 * time)
    + sin(3.19 * normal.yzx + 2.57 * normal.zxy + 8.31 * time)
    + sin(4.31 * normal.zxy + 3.43 * normal.xyz + 7.23 * time)
  );
  cc = a.x + a.y + a.z;
  vPosition = (modelMatrix * vec4(position + 0.0001 * a, 1)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1);
}
`

const fragmentShader = `
varying vec3 vPosition, vNormal;
varying float cc;
void main() {
  float c = - dot(normalize(vPosition - cameraPosition), normalize(vNormal));
  gl_FragColor.rgb = 4.0 * (0.4 + 0.6 * c) * vec3(0.8, 0.4, 0.2) * (0.5 + 0.025 * cc);
  gl_FragColor.a = min(20.0 * c, 1.0);
}
`

export class Ball {
  uniforms = {
    time: { value: 0 }
  }
  mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false
    })
  )
  update(time: number) {
    this.uniforms.time.value = time
  }
}
