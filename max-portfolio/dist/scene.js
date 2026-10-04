// A ribbon knot drawn with WebGL. Geometry and lighting are generated locally.
export function startScene(canvas, isPaused) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    premultipliedAlpha: false,
  });
  if (!gl) {
    fallback(canvas);
    return { refresh() {} };
  }
  const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uProjection;varying vec3 vNormal;varying vec3 vPosition;void main(){vec4 p=uModel*vec4(aPosition,1.);vPosition=p.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uProjection*vec4(p.xyz+vec3(0.,0.,-7.3),1.);}`;
  const fragment = `precision mediump float;varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal);vec3 view=normalize(vec3(0.,0.,7.3)-vPosition);vec3 r=reflect(-view,n);float facing=abs(dot(n,view));float f=pow(1.-facing,2.7);float band=sin(r.y*9.+r.x*3.)*.5+.5;float thin=pow(max(0.,sin(r.y*16.+r.z*3.)),8.);vec3 dark=vec3(.065,.075,.12);vec3 silver=vec3(.67,.74,.85);vec3 c=mix(dark,silver,smoothstep(.06,.86,band));c=mix(c,vec3(.60,.35,.95),smoothstep(.18,.9,r.x)*.56);c=mix(c,vec3(.39,.81,.94),smoothstep(.08,.9,-r.x)*.61);c+=vec3(.66,.75,.87)*thin*.62;float spec=pow(max(dot(reflect(-normalize(vec3(-3.,5.,4.)),n),view),0.),70.);c+=vec3(1.,.9,.98)*spec*1.4;c+=vec3(.62,.58,.86)*f*.45;float lower=smoothstep(-2.2,2.7,vPosition.y);c*=.6+lower*.55;gl_FragColor=vec4(c,1.);}`;
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error("Link failed");
  } catch {
    fallback(canvas);
    return { refresh() {} };
  }
  const points = [],
    normals = [],
    indices = [],
    seg = 240,
    sides = 14,
    tau = Math.PI * 2;
  const center = (t) => [
    (1.65 + 0.47 * Math.cos(3 * t)) * Math.cos(2 * t),
    (1.65 + 0.47 * Math.cos(3 * t)) * Math.sin(2 * t),
    0.62 * Math.sin(3 * t),
  ];
  const normalize = (v) => {
    const length = Math.hypot(...v) || 1;
    return v.map((x) => x / length);
  };
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * tau,
      c = center(t),
      a = center(t - 0.001),
      b = center(t + 0.001),
      tangent = normalize(b.map((x, k) => x - a[k]));
    const reference = Math.abs(tangent[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1],
      rawN = normalize(cross(tangent, reference)),
      rawB = normalize(cross(tangent, rawN)),
      twist = t * 1.5;
    const n = rawN.map(
        (v, k) => v * Math.cos(twist) + rawB[k] * Math.sin(twist),
      ),
      bin = rawB.map((v, k) => v * Math.cos(twist) - rawN[k] * Math.sin(twist));
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * tau,
        ca = Math.cos(angle),
        sa = Math.sin(angle);
      points.push(
        ...c.map((v, k) => v + n[k] * ca * 0.3 + bin[k] * sa * 0.105),
      );
      normals.push(
        ...normalize(n.map((v, k) => (v * ca) / 0.3 + (bin[k] * sa) / 0.105)),
      );
      if (i < seg && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  gl.useProgram(program);
  function buffer(name, data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  }
  buffer("aPosition", points);
  buffer("aNormal", normals);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  const uModel = gl.getUniformLocation(program, "uModel"),
    uProjection = gl.getUniformLocation(program, "uProjection");
  let width = 0,
    height = 0,
    frame = 0,
    visible = true,
    lost = false,
    time = 0,
    last = 0,
    pointerX = 0,
    pointerY = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    width = Math.round(r.width);
    height = Math.round(r.height);
    const dpr = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = width / Math.max(height, 1),
      f = 1 / Math.tan(0.65 / 2),
      near = 0.1,
      far = 30;
    gl.uniformMatrix4fv(
      uProjection,
      false,
      new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0,
      ]),
    );
    render();
  }
  function model(x, y, z) {
    const cx = Math.cos(x),
      sx = Math.sin(x),
      cy = Math.cos(y),
      sy = Math.sin(y),
      cz = Math.cos(z),
      sz = Math.sin(z);
    return new Float32Array([
      cy * cz,
      cy * sz,
      -sy,
      0,
      sx * sy * cz - cx * sz,
      sx * sy * sz + cx * cz,
      sx * cy,
      0,
      cx * sy * cz + sx * sz,
      cx * sy * sz - sx * cz,
      cx * cy,
      0,
      0,
      0,
      0,
      1,
    ]);
  }
  function render() {
    if (lost || !width || !height) return;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(
      uModel,
      false,
      model(
        0.6 + Math.sin(time * 0.17) * 0.25 + pointerY * 0.2,
        time * 0.11 + 0.3 + pointerX * 0.25,
        -0.4 + Math.sin(time * 0.12) * 0.2,
      ),
    );
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }
  function loop(now) {
    frame = 0;
    if (!visible || document.hidden || isPaused() || lost) {
      last = 0;
      return;
    }
    if (now - last < 32) {
      frame = requestAnimationFrame(loop);
      return;
    }
    if (last) time += Math.min((now - last) / 1000, 0.06);
    last = now;
    render();
    frame = requestAnimationFrame(loop);
  }
  function refresh() {
    cancelAnimationFrame(frame);
    frame = 0;
    render();
    if (!isPaused() && visible && !document.hidden && !lost)
      frame = requestAnimationFrame(loop);
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      refresh();
    },
    { rootMargin: "100px" },
  ).observe(canvas);
  document.addEventListener("visibilitychange", refresh);
  const hero = canvas.closest(".hero");
  hero.addEventListener("pointermove", (e) => {
    if (isPaused() || e.pointerType === "touch") return;
    const r = hero.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width - 0.5;
    pointerY = (e.clientY - r.top) / r.height - 0.5;
  });
  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
  });
  canvas.addEventListener("webglcontextrestored", () => location.reload());
  resize();
  refresh();
  return { refresh };
}
function fallback(canvas) {
  const replacement = document.createElement("canvas");
  canvas.replaceWith(replacement);
  replacement.id = canvas.id;
  const ctx = replacement.getContext("2d");
  if (!ctx) return;
  new ResizeObserver(() => {
    const r = replacement.getBoundingClientRect();
    replacement.width = r.width;
    replacement.height = r.height;
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.strokeStyle = "#b3a0dd";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.ellipse(
        r.width * 0.5,
        r.height * 0.5,
        Math.min(r.width, r.height) * 0.37,
        Math.min(r.width, r.height) * 0.12,
        (i * Math.PI) / 70,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }).observe(replacement);
}
