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

function solve(n: number, k: number, f: number[][], g: number[][]) {
  const tmp = array2D(n)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = (
      g[(i + n - 1) % n][j] + g[(i + 1) % n][j]+ g[i][(j + n - 1) % n] + g[i][(j + 1) % n]
    ) / (1 + 4 * k)
    f[i][j] = (g[i][j] + k * sum) / (1 + 4 * k)
  }
  if (n <= 2) return
  const errors = array2D(n)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = f[(i + n - 1) % n][j] + f[(i + 1) % n][j]+ f[i][(j + n - 1) % n] + f[i][(j + 1) % n]
    errors[i][j] = (1 + 4 * k) * f[i][j] - k * sum - g[i][j]
  }
  const g2 = array2D(n / 2)
  const f2 = array2D(n / 2)
  for (let i = 0; i < n / 2; i++) for (let j = 0; j < n / 2; j++) {
    const ia = (2 * i - 1 + n) % n, ib = (2 * i + 1) % n
    const ja = (2 * j - 1 + n) % n, jb = (2 * j + 1) % n
    g2[i][j] = -(
      + errors[ia][ja] + 2 * errors[ia][2 * j] + errors[ia][jb]
      + 2 * errors[2 * i][ja] + 4 * errors[2 * i][2 * j] + 2 * errors[2 * i][jb]
      + errors[ib][ja] + 2 * errors[ib][2 * j] + errors[ib][jb]
    ) / 16
  }
  solve(n / 2, k / 4, f2, g2)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ia = Math.floor(i / 2), ib = Math.floor((i + 1) / 2) % (n / 2)
    const ja = Math.floor(j / 2), jb = Math.floor((j + 1) / 2) % (n / 2)
    tmp[i][j] = f[i][j] + (f2[ia][ja] + f2[ia][jb] + f2[ib][ja] + f2[ib][jb]) / 4
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const sum = tmp[(i + n - 1) % n][j] + tmp[(i + 1) % n][j]+ tmp[i][(j + n - 1) % n] + tmp[i][(j + 1) % n]
    f[i][j] = (g[i][j] + k * sum) / (1 + 4 * k)
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
  solve(n, k, arr1, f)
  console.log(calcError(n, k, arr1, f))
  solve(n, 2 * k, arr2, f)
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
