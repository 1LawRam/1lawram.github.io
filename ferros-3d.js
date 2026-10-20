(function () {
const THREE = window.THREE;
if (!THREE) return;
const RoomEnvironment = THREE.RoomEnvironment;

const R = 9;
const L1 = 4.2;
const L2 = 3.6;
const TARGET = new THREE.Vector3(0.9, 0.51, 0);
const APPROACH = new THREE.Vector3(-Math.sin(0.61) * 2.7, Math.cos(0.61) * 2.7, 0);

// Carriage envelope, measured from the rail centreline it rides on. Nothing
// fixed to the arch may sit inside this or the carriage will pass through it
// somewhere in its 180° of travel.
const CAR_OUT = 0.26;   // furthest the carriage reaches *outboard* of the rail
const CAR_IN = 1.66;    // furthest it hangs inboard (shoulder pivot)
const CAR_Z = 0.78;     // half-width across the rail

const PARKED = { s1: -0.62, s2: 1.15, s3: -0.34 };

// th is the carriage angle on the arch: 180° = left foot, 90° = apex, 0° = right foot.
const KF = [
  { th: 172, reach: 0, cones: 0, rings: 0, feed: 0, glow: 0, az: -36, el: 22, dist: 35 },
  { th: 8, reach: 0, cones: 0.7, rings: 0, feed: 0, glow: 0, az: 14, el: 24, dist: 36 },
  { th: 104, reach: 0.92, cones: 1, rings: 1, feed: 0, glow: 0.25, az: -16, el: 21, dist: 30 },
  { th: 93, reach: 1, cones: 0.35, rings: 0, feed: 1, glow: 1, az: -6, el: 18, dist: 27 }
];

function roundedBox(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d, bevelEnabled: true, bevelSize: r * 0.3,
    bevelThickness: r * 0.3, bevelSegments: 3, curveSegments: 10
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

function layerTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 128; i++) {
    const v = 128 + Math.sin(i * Math.PI / 4) * 46 + (i % 8 === 0 ? -26 : 0);
    x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    x.fillRect(0, i, 4, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 14);
  return t;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function sampleKF(p) {
  const seg = p * (KF.length - 1);
  const i = Math.min(KF.length - 2, Math.floor(seg));
  const t = ease(Math.min(1, Math.max(0, seg - i)));
  const a = KF[i], b = KF[i + 1];
  const out = {};
  for (const k in a) out[k] = lerp(a[k], b[k], t);
  out.index = Math.round(seg);
  return out;
}

function buildFerros(dark) {
  const root = new THREE.Group();
  const bump = layerTexture();

  const printed = new THREE.MeshPhysicalMaterial({
    color: dark ? 0x3a322a : 0x2e2620, roughness: 0.66, metalness: 0.04,
    clearcoat: 0.12, clearcoatRoughness: 0.7, bumpMap: bump, bumpScale: 0.012
  });
  const printedAlt = new THREE.MeshPhysicalMaterial({
    color: dark ? 0x6e6256 : 0x8a7c6b, roughness: 0.6, metalness: 0.05,
    bumpMap: bump, bumpScale: 0.01
  });
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xc2c6cd, roughness: 0.26, metalness: 1
  });
  const solderMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2e6ee, roughness: 0.13, metalness: 1
  });
  const copper = new THREE.MeshPhysicalMaterial({
    color: 0xe4572e, roughness: 0.33, metalness: 0.92
  });
  const pcbMat = new THREE.MeshPhysicalMaterial({
    color: 0x17452f, roughness: 0.46, metalness: 0.05, clearcoat: 0.3
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c, roughness: 0.09, metalness: 0.4, clearcoat: 1
  });

  const bench = new THREE.Mesh(
    new THREE.CylinderGeometry(12.5, 12.5, 0.5, 72),
    new THREE.MeshPhysicalMaterial({
      color: dark ? 0x211b15 : 0xece4d4, roughness: 0.92, metalness: 0
    })
  );
  bench.position.y = -0.25;
  bench.receiveShadow = true;
  root.add(bench);

  const fixture = new THREE.Mesh(roundedBox(8.4, 0.36, 5.6, 0.14), printedAlt);
  fixture.position.y = 0.18;
  fixture.castShadow = fixture.receiveShadow = true;
  root.add(fixture);

  const pcb = new THREE.Mesh(roundedBox(5.4, 0.16, 3.4, 0.1), pcbMat);
  pcb.position.y = 0.44;
  pcb.castShadow = pcb.receiveShadow = true;
  root.add(pcb);

  const padGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 12);
  const pads = new THREE.InstancedMesh(padGeo, copper, 44);
  const m4 = new THREE.Matrix4();
  let pi = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 11; c++) {
      m4.makeTranslation(-2.2 + c * 0.44, 0.53, -0.95 + r * 0.63);
      pads.setMatrixAt(pi++, m4);
    }
  }
  pads.castShadow = true;
  root.add(pads);

  const arch = new THREE.Group();
  root.add(arch);

  for (const z of [-0.52, 0.52]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.17, 14, 150, Math.PI), metal);
    rail.position.z = z;
    rail.castShadow = true;
    arch.add(rail);
  }

  const spine = new THREE.Mesh(new THREE.TorusGeometry(R, 0.34, 12, 150, Math.PI), printed);
  spine.scale.z = 0.9;
  spine.position.z = 0;
  spine.castShadow = true;
  arch.add(spine);

  const toothGeo = new THREE.BoxGeometry(0.1, 0.26, 0.5);
  const teeth = new THREE.InstancedMesh(toothGeo, printedAlt, 96);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 96; i++) {
    const a = (i / 95) * Math.PI;
    dummy.position.set(Math.cos(a) * (R - 0.42), Math.sin(a) * (R - 0.42), 0);
    dummy.rotation.set(0, 0, a);
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  arch.add(teeth);

  // Crown: a printed saddle that clamps the arch from *outside* the carriage
  // channel. Everything fixed at the apex hangs off this, so the carriage runs
  // underneath it instead of through it.
  const CROWN_Y = R + 0.78;
  const crown = new THREE.Mesh(roundedBox(1.6, 0.36, 3.0, 0.16), printed);
  crown.name = 'fixed:crown';
  crown.position.set(0, CROWN_Y, 0);
  crown.castShadow = true;
  arch.add(crown);
  for (const z of [-1.15, 1.15]) {
    const tab = new THREE.Mesh(roundedBox(0.9, 1.1, 0.22, 0.1), printedAlt);
    tab.name = 'fixed:crownTab';
    tab.position.set(0, R + 0.22, z);
    arch.add(tab);
  }

  const backCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, CROWN_Y - 0.1, -1.3),
    new THREE.Vector3(0, R * 0.82, -3.4),
    new THREE.Vector3(0, R * 0.45, -5.6),
    new THREE.Vector3(0, 0.12, -7.1)
  ]);
  const backLeg = new THREE.Mesh(new THREE.TubeGeometry(backCurve, 60, 0.3, 12), printed);
  backLeg.name = 'fixed:backLeg';
  backLeg.castShadow = true;
  arch.add(backLeg);

  const footGeo = roundedBox(1.5, 0.34, 1.5, 0.16);
  for (const p of [[R, 0.17, 0], [-R, 0.17, 0], [0, 0.17, -7.1]]) {
    const f = new THREE.Mesh(footGeo, printed);
    f.position.set(p[0], p[1], p[2]);
    f.castShadow = f.receiveShadow = true;
    arch.add(f);
  }

  // Apex head, lifted clear on a short mast off the crown. Its underside sits
  // well above the carriage, which passes below it at the top of the sweep.
  const HEAD_Y = R + 1.62;
  const mastCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, CROWN_Y - 0.05, -1.1),
    new THREE.Vector3(0, R + 1.05, -1.15),
    new THREE.Vector3(0, HEAD_Y - 0.1, -0.85),
    new THREE.Vector3(0, HEAD_Y, -0.5)
  ]);
  const mast = new THREE.Mesh(new THREE.TubeGeometry(mastCurve, 40, 0.22, 10), printedAlt);
  mast.name = 'fixed:mast';
  mast.castShadow = true;
  arch.add(mast);

  const head = new THREE.Group();
  head.name = 'fixed:head';
  head.position.set(0, HEAD_Y, -0.35);
  arch.add(head);
  const headShell = new THREE.Mesh(roundedBox(3.1, 0.84, 1.5, 0.28), printed);
  headShell.castShadow = true;
  head.add(headShell);
  for (const x of [-0.86, 0.86]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 20), glassMat);
    lens.position.set(x, -0.44, 0);
    head.add(lens);
  }
  const thermWin = new THREE.Mesh(roundedBox(0.72, 0.12, 0.5, 0.05), copper);
  thermWin.position.set(0, -0.44, 0);
  head.add(thermWin);

  const camGroup = new THREE.Group();
  camGroup.name = 'fixed:cameras';
  arch.add(camGroup);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x3fa34d, transparent: true, opacity: 0, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false
  });
  // Side cameras stand on their own masts, offset forward in +Z so they sit
  // clear of the carriage's swept channel (|z| <= CAR_Z) at every angle.
  const CAM_Z = 1.95;
  const CAM_X = R - 1.2;
  const CAM_Y = 4.4;
  for (const x of [-CAM_X, CAM_X]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, CAM_Y - 0.2, 14), printedAlt);
    post.position.set(x, (CAM_Y - 0.2) / 2 + 0.2, CAM_Z);
    post.castShadow = true;
    camGroup.add(post);
    const base = new THREE.Mesh(roundedBox(0.95, 0.3, 0.95, 0.14), printed);
    base.position.set(x, 0.2, CAM_Z);
    base.castShadow = base.receiveShadow = true;
    camGroup.add(base);
  }

  const camSpots = [
    new THREE.Vector3(CAM_X, CAM_Y, CAM_Z),
    new THREE.Vector3(-CAM_X, CAM_Y, CAM_Z),
    new THREE.Vector3(0, HEAD_Y - 0.5, -0.35)
  ];
  const cones = [];
  for (const sp of camSpots) {
    const body = new THREE.Mesh(roundedBox(0.66, 0.44, 0.5, 0.12), printedAlt);
    body.position.copy(sp);
    body.lookAt(TARGET);
    camGroup.add(body);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), glassMat);
    lens.position.copy(sp).lerp(TARGET, 0.045);
    camGroup.add(lens);

    const d = sp.distanceTo(TARGET);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, d, 26, 1, true), coneMat.clone());
    cone.position.copy(sp).lerp(TARGET, 0.5);
    cone.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      TARGET.clone().sub(sp).normalize()
    );
    camGroup.add(cone);
    cones.push(cone);
  }

  // Local +Y points radially outboard. The rollers sit on the rail centreline
  // and the body hangs inboard, so the carriage's outboard reach is one roller
  // radius (CAR_OUT) and everything else clears below the track.
  const carriage = new THREE.Group();
  carriage.name = 'carriage';
  arch.add(carriage);

  // Six rollers, matching the F625ZZ count in the bill of materials.
  const rollerGeo = new THREE.CylinderGeometry(CAR_OUT, CAR_OUT, 0.2, 16);
  for (const x of [-0.74, 0, 0.74]) {
    for (const z of [-0.52, 0.52]) {
      const rl = new THREE.Mesh(rollerGeo, metal);
      rl.rotation.x = Math.PI / 2;
      rl.position.set(x, 0, z);
      carriage.add(rl);
    }
  }

  // Pinion meshing the rack cut into the arch.
  const pinion = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 20), metal);
  pinion.rotation.x = Math.PI / 2;
  pinion.position.set(0, -0.4, 0);
  carriage.add(pinion);

  for (const z of [-0.66, 0.66]) {
    const plate = new THREE.Mesh(roundedBox(1.75, 1.05, 0.16, 0.1), printedAlt);
    plate.position.set(0, -0.5, z);
    carriage.add(plate);
  }

  const cShell = new THREE.Mesh(roundedBox(2.1, 1.24, 1.56, 0.26), printed);
  cShell.position.y = -0.98;
  cShell.castShadow = true;
  carriage.add(cShell);

  const shoulder = new THREE.Group();
  shoulder.position.y = -CAR_IN;
  carriage.add(shoulder);
  const servoGeo = roundedBox(0.9, 0.9, 1.05, 0.16);
  const sv1 = new THREE.Mesh(servoGeo, printedAlt);
  shoulder.add(sv1);
  const upper = new THREE.Mesh(roundedBox(0.72, L1, 0.86, 0.2), printed);
  upper.position.y = -L1 / 2;
  upper.castShadow = true;
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -L1;
  shoulder.add(elbow);
  const sv2 = new THREE.Mesh(servoGeo, printedAlt);
  elbow.add(sv2);
  const fore = new THREE.Mesh(roundedBox(0.62, L2, 0.74, 0.18), printed);
  fore.position.y = -L2 / 2;
  fore.castShadow = true;
  elbow.add(fore);

  const wrist = new THREE.Group();
  wrist.position.y = -L2;
  elbow.add(wrist);
  const sv3 = new THREE.Mesh(roundedBox(0.66, 0.66, 0.76, 0.13), printedAlt);
  wrist.add(sv3);
  const block = new THREE.Mesh(roundedBox(0.56, 0.7, 0.6, 0.12), printed);
  block.position.y = -0.5;
  wrist.add(block);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 1.25, 12), metal);
  needle.position.y = -1.42;
  wrist.add(needle);

  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), solderMat);
  wire.position.y = -2.05;
  wire.scale.y = 0;
  wrist.add(wire);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), solderMat);
  bead.position.copy(TARGET);
  bead.scale.setScalar(0);
  root.add(bead);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff7a1a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(TARGET.x, TARGET.y + 0.02, TARGET.z);
  root.add(glow);

  const rings = [];
  for (let i = 0; i < 2; i++) {
    const rg = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.57, 44),
      new THREE.MeshBasicMaterial({
        color: 0x0a84ff, transparent: true, opacity: 0, depthWrite: false,
        side: THREE.DoubleSide, toneMapped: false
      })
    );
    rg.rotation.x = -Math.PI / 2;
    rg.position.set(TARGET.x, TARGET.y + 0.09, TARGET.z);
    root.add(rg);
    rings.push(rg);
  }

  const SWEEP_R = R + 2.7;
  const sweep = new THREE.Mesh(
    new THREE.TorusGeometry(SWEEP_R, 0.03, 6, 120, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xe4572e, transparent: true, opacity: 0.45, toneMapped: false
    })
  );
  root.add(sweep);

  const tickGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0xe4572e, transparent: true, opacity: 0.55, toneMapped: false
  });
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * Math.PI;
    const tk = new THREE.Mesh(tickGeo, tickMat);
    tk.position.set(Math.cos(a) * SWEEP_R, Math.sin(a) * SWEEP_R, 0);
    tk.rotation.z = a;
    root.add(tk);
  }

  function pose(p, time) {
    const k = sampleKF(p);
    const th = k.th * Math.PI / 180;

    carriage.position.set(Math.cos(th) * R, Math.sin(th) * R, 0);
    carriage.rotation.z = th - Math.PI / 2;
    // Roll the pinion by the arc length it has travelled along the rack.
    pinion.rotation.y = -th * R / 0.32;

    carriage.updateMatrixWorld(true);
    const tipLocal = carriage.worldToLocal(TARGET.clone());
    const wristLocal = carriage.worldToLocal(TARGET.clone().add(APPROACH));
    tipLocal.y += CAR_IN;
    wristLocal.y += CAR_IN;

    const want = new THREE.Vector2(wristLocal.x, wristLocal.y);
    const dist = Math.min(L1 + L2 - 0.05, Math.max(0.6, want.length()));
    const cos2 = (dist * dist - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const a2 = Math.acos(Math.max(-1, Math.min(1, cos2)));
    const base = Math.atan2(want.x, -want.y);
    const a1 = base - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));

    const dx = tipLocal.x - wristLocal.x;
    const dy = tipLocal.y - wristLocal.y;
    const dl = Math.hypot(dx, dy) || 1;
    const aim = Math.atan2(dx / dl, -dy / dl) - a1 - a2;

    const r = k.reach;
    shoulder.rotation.z = lerp(PARKED.s1, a1, r);
    elbow.rotation.z = lerp(PARKED.s2, a2, r);
    wrist.rotation.z = lerp(PARKED.s3, aim, r);

    // Unlit green reads hotter against a dark bench, so damp it there.
    for (const c of cones) c.material.opacity = k.cones * 0.13 * root.userData.coneScale;

    const pulse = k.rings * (0.55 + 0.45 * Math.sin(time * 4));
    rings.forEach(function (rg, i) {
      const g = (time * 0.7 + i * 0.5) % 1;
      rg.scale.setScalar(0.6 + g * 2.1);
      rg.material.opacity = k.rings * (1 - g) * 0.75;
    });

    wire.scale.y = k.feed * 0.66;
    wire.position.y = -2.045 - k.feed * 0.33;
    bead.scale.setScalar(k.feed * (0.85 + 0.15 * Math.sin(time * 3)));
    glow.material.opacity = k.glow * 0.46;
    glow.scale.setScalar(0.8 + k.glow * 0.3 + pulse * 0.04);

    return k;
  }

  root.userData = {
    pose: pose,
    coneScale: dark ? 0.62 : 1,
    materials: { bench: bench.material, printed, printedAlt }
  };
  return root;
}

function mount(canvas, opts) {
  opts = opts || {};
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const isDark = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(9, 15, 11);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -18; key.shadow.camera.right = 18;
  key.shadow.camera.top = 18; key.shadow.camera.bottom = -18;
  key.shadow.bias = -0.0012;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdce6ff, 0.5);
  fill.position.set(-12, 7, 6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd9b0, 0.7);
  rim.position.set(-4, 6, -14);
  scene.add(rim);

  const arm = buildFerros(isDark());
  scene.add(arm);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 300);
  const look = new THREE.Vector3(0, 4.2, 0);

  function applyTheme() {
    const d = isDark();
    arm.userData.materials.bench.color.set(d ? 0x211b15 : 0xece4d4);
    arm.userData.materials.printed.color.set(d ? 0x3a322a : 0x2e2620);
    arm.userData.materials.printedAlt.color.set(d ? 0x6e6256 : 0x8a7c6b);
    arm.userData.coneScale = d ? 0.62 : 1;
    key.intensity = d ? 1.7 : 2.1;
    rim.intensity = d ? 1.0 : 0.7;
    renderer.toneMappingExposure = d ? 0.95 : 1.05;
  }
  applyTheme();

  let progress = opts.progress || 0;
  let raf = 0;
  const clock = new THREE.Clock();

  function onScreen() {
    const r = canvas.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > -120 && r.top < innerHeight + 120;
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !onScreen()) return;
    resize();
    const t = clock.getElapsedTime();
    // The idle tile favours the second half of the story — carriage climbing to
    // the board, then soldering — which reads better at thumbnail size.
    const p = opts.idle ? (0.5 + 0.5 * Math.sin(t * 0.2)) * 0.56 + 0.42 : progress;
    const k = arm.userData.pose(p, t);

    const az = (k.az + (opts.idle ? Math.sin(t * 0.17) * 9 : 0)) * Math.PI / 180;
    const el = k.el * Math.PI / 180;
    const fit = Math.min(1.34, camera.aspect < 1.45 ? Math.pow(1.45 / camera.aspect, 0.55) : 1);
    const dist = k.dist * fit * (opts.zoom || 1);
    camera.position.set(
      look.x + Math.sin(az) * Math.cos(el) * dist,
      look.y + Math.sin(el) * dist,
      look.z + Math.cos(az) * Math.cos(el) * dist
    );
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (opts.onStep) opts.onStep(k.index);
  }

  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  resize();
  frame();

  return {
    set: function (p) { progress = Math.min(1, Math.max(0, p)); },
    dispose: function () { cancelAnimationFrame(raf); renderer.dispose(); }
  };
}

window.FerrosScene = { mount: mount, buildFerros: buildFerros };
})();
