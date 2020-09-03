import * as THREE from 'three'
const geometry = new THREE.SphereBufferGeometry(0.006, 32, 32)

const vertexShader = `
uniform float time;
varying vec3 vPosition, vNormal;
void main() {
  vNormal = normal;
  vPosition = position + 0.0001 * (
    + sin(6.23 * normal.xyz - 4.21 * normal.yzx + 15.27 * time)
    + sin(5.18 * normal.yzx - 5.31 * normal.zxy + 13.33 * time)
    + sin(4.71 * normal.zxy - 6.16 * normal.xyz + 17.51 * time)
    + sin(2.37 * normal.xyz - 4.31 * normal.yzx + 9.17 * time)
    + sin(3.19 * normal.yzx - 2.57 * normal.zxy + 8.31 * time)
    + sin(4.31 * normal.zxy - 3.43 * normal.xyz + 7.23 * time)
  );
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1);
}
`

const fragmentShader = `
varying vec3 vPosition, vNormal;
void main() {
  float c = - dot(normalize(vPosition - cameraPosition), normalize(vNormal));
  gl_FragColor = vec4(3.0 * c * vec3(0.8, 0.4, 0.2), 1);
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
      fragmentShader
    })
  )
  update(time: number) {
    this.uniforms.time.value = time
  }
}
