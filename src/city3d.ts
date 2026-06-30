// @ts-nocheck

import * as THREE from 'three';
import { TweenMax, Power1 } from 'gsap';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

const LINKEDIN_URL = 'https://www.linkedin.com/in/daniel-odea/';

// dial back the most expensive effects on weak / old machines
const isLowEndDevice =
  (typeof navigator !== 'undefined' &&
    ((navigator.hardwareConcurrency || 8) <= 4 ||
      (navigator.deviceMemory || 8) <= 4)) ||
  (typeof window !== 'undefined' && window.innerWidth <= 800);

// ---- bouncy ball physics tuning ----
const GRAVITY = 16;
const BALL_R = 0.18;
const RESTITUTION = 0.62;
const GROUND_FRICTION = 0.86;
const SMASH_SPEED = 2.2; // downward speed needed to crash through a rooftop
const MAX_BALLS = 220;
const BALLS_PER_CLICK = 6;
// a curated neon palette (harmonises with the scene instead of random rainbow)
const BALL_COLORS = ['#ff2e7e', '#ffd000', '#19f0ff', '#9b5cff', '#ff7a18', '#3dffa6', '#ff4fd8', '#4d7bff'];

// the LinkedIn orb sits low-centre of the view (child of the camera)
const ORB_Y = -0.95;

const colors = [
  {
    fogColor: "#0a0091",
    particleColor: "#0a0091",
    lineColor: "#0a0091",
    buildingColor: "#020012",
    groundColor: "#04000a"
  },
  {
    fogColor: "#562A69",
    particleColor: "#562A69",
    lineColor: "#562A69",
    buildingColor: "#000012",
    groundColor: "#00000a"
  },
  {
    fogColor: "#db5139",
    particleColor: "#db5139",
    lineColor: "#db5139",
    buildingColor: "#120000",
    groundColor: "#0b0000"
  },
  {
    fogColor: "#E79411",
    particleColor: "#E79411",
    lineColor: "#E79411",
    buildingColor: "#0f0800",
    groundColor: "#130a00"
  },
  {
    fogColor: "#f2bf58",
    particleColor: "#f2bf58",
    lineColor: "#f2bf58",
    buildingColor: "#160f00",
    groundColor: "#1d1b04"
  }
];

const bloomSettings = {
  maxStrength: 1.5,
  strength: 0,
  strengthDelta: 0.1,
  radius: 0,
  threshold: 0
}

// TODO - improve performance when browser left open, maybe by deleting lines - clean up arrays

var intersectingObject;

var cubeCamera;
var cubeRenderTarget;
var sphere1;

var renderer;

var cubes = [];
var floors = [];
var lines = [];
var currentColors = colors[Math.floor(colors.length/2)];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
var camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 500 );

var scene;
var city;
var smoke;
var town;

var finalComposer;
var sceneFog;
var noFog;
var darkMaterial;
var materials;
var bloomPass;
var bloomComposer;
var createCarPos;


// var time = Date.now() * 0.00005;
var clock = new THREE.Clock();
var elapsedTime = 0;
var frameCount = 0;

// bouncy ball physics state
var balls = [];
var buildings = []; // collidable building "containers"
var ballGeo;
var groundMesh;
var tallestTop = 4; // height of the tallest rooftop — balls drop from about here


// Three JS Template
//----------------------------------------------------------------- BASIC parameters

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function strToHex(str) {
  return parseInt(str.replace(/^#/, ''), 16);
}

function changeColorByMouseY(percent) {
  const lowerColorIndex = Math.floor((colors.length - 1) * (percent / 100));
  const color1 = colors[lowerColorIndex];
  const color2 = colors[lowerColorIndex + 1];
  const newColors = {}

  const weight = 1 - (((colors.length - 1) * (percent / 100)) % 1);

  Object.keys(color1).forEach(key => {
    const tmpColor1 = hexToRgb(color1[key]);
    const tmpColor2 = hexToRgb(color2[key]);
    const mixedColorR = Math.floor((tmpColor1.r * weight) + (tmpColor2.r * (1 - weight)))
    const mixedColorG = Math.floor((tmpColor1.g * weight) + (tmpColor2.g * (1 - weight)))
    const mixedColorB = Math.floor((tmpColor1.b * weight) + (tmpColor2.b * (1 - weight)))
    const mixedColorHex = rgbToHex(mixedColorR, mixedColorG, mixedColorB);
    newColors[key] = mixedColorHex;
  });
  currentColors = newColors;

  // if (sphere1 != null) {
  //   const invertedFogColor = new THREE.Color(tinycolor(currentColors.fogColor).complement().lighten(0).toHexString());
  //   const sphere1Material: THREE.MeshStandardMaterial = sphere1.material;
  //   sphere1Material.color.set(invertedFogColor);
  // }

}
function setupScene(cityRef) {
  
  // setup renderer
  renderer = new THREE.WebGLRenderer({antialias: !isLowEndDevice, powerPreference: 'high-performance'});
  renderer.setSize( window.innerWidth, window.innerHeight );
  // capping the pixel ratio is the single biggest win on weak GPUs
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowEndDevice ? 1 : 1.5));

  if (window.innerWidth > 800 && !isLowEndDevice) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
  };
  
  const cityElement = cityRef.current;
  cityElement.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    bloomComposer.setSize(window.innerWidth, window.innerHeight);
    finalComposer.setSize(window.innerWidth, window.innerHeight);
  };

  // diagonal ~45-degree view looking down on the city (kept within the fog range)
  camera.position.set(0, 9, 9);

  scene = new THREE.Scene();
  city = new THREE.Object3D();
  smoke = new THREE.Object3D();
  town = new THREE.Object3D();

  scene.add(camera);

  // set up bloom
  
  bloomLayer.set(BLOOM_SCENE);

  darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
  materials = {};

  const renderScene = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloomPass.strength = bloomSettings.strength;
  bloomPass.radius = bloomSettings.radius;
  bloomPass.threshold = bloomSettings.threshold;

  bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

  const finalPassIncludingBloom = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture }
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
      `,
      fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
      }
      `,
      defines: {}
    }), 'baseTexture'
  );
  finalPassIncludingBloom.needsSwap = true;
  
  finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(renderScene);
  finalComposer.addPass(finalPassIncludingBloom);
  
  sceneFog = new THREE.Fog(currentColors.fogColor, 10, 16);
  noFog = new THREE.Fog(0x000, 1000, 1000);

  createCarPos = true;

  //----------------------------------------------------------------- FOG background

  scene.background = new THREE.Color(currentColors.fogColor);
  scene.fog = sceneFog;
  // scene.fog = new THREE.FogExp2(setcolor, 0.05);


  // IMAGE
  var loader = new THREE.TextureLoader();
  var material = new THREE.MeshToonMaterial({
    map: loader.load(process.env.PUBLIC_URL + '/linkedin-logo.png'),
    transparent: true,
    needsUpdate: true
  });
  var geometry = new THREE.PlaneGeometry(0.2, 0.2);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 0.16;
  mesh.scale.set(0.4, 0.4, 1);
  sphere1.add(mesh);

}
//----------------------------------------------------------------- RANDOM Function
function mathRandom(num = 8) {
  var numValue = - Math.random() * num + Math.random() * num;
  return numValue;
};

//----------------------------------------------------------------- CREATE City

function init() {

  ballGeo = new THREE.SphereGeometry(BALL_R, 12, 12);

  var segments = 2;
  for (var i = 1; i<100; i++) {
    var geometry = new THREE.BoxGeometry(1,1,1,segments,segments,segments);
    var material = new THREE.MeshStandardMaterial({
      color:currentColors.buildingColor,
      wireframe:false,
      //opacity:0.9,
      //transparent:true,
      //roughness: 0.3,
      //metalness: 1,
      shading: THREE.SmoothShading,
      //shading:THREE.FlatShading,
      side:THREE.DoubleSide});
    var wmaterial = new THREE.MeshLambertMaterial({
      color:0xFFFFFF,
      wireframe:true,
      transparent:true,
      opacity: 0.03,
      side:THREE.DoubleSide/*,
      shading:THREE.FlatShading*/});

    var cube = new THREE.Mesh(geometry, material);
    var floor = new THREE.Mesh(geometry, material);
    var wfloor = new THREE.Mesh(geometry, wmaterial);

    cube.name = "cubeobj"
    floor.name = "floorobj";

    cube.add(wfloor);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.rotationValue = 0.1+Math.abs(mathRandom(8));
    
    //floor.scale.x = floor.scale.z = 1+mathRandom(0.33);
    floor.scale.y = 0.05;//+mathRandom(0.5);
    cube.scale.y = 0.1+Math.abs(mathRandom(8));
    //TweenMax.to(cube.scale, 1, {y:cube.rotationValue, repeat:-1, yoyo:true, delay:i*0.005, ease:Power1.easeInOut});
    /*cube.setScale = 0.1+Math.abs(mathRandom());
    
    TweenMax.to(cube.scale, 4, {y:cube.setScale, ease:Elastic.easeInOut, delay:0.2*i, yoyo:true, repeat:-1});
    TweenMax.to(cube.position, 4, {y:cube.setScale / 2, ease:Elastic.easeInOut, delay:0.2*i, yoyo:true, repeat:-1});*/
    
    var cubeWidth = 0.9;
    cube.scale.x = cube.scale.z = cubeWidth+mathRandom(1-cubeWidth);
    //cube.position.y = cube.scale.y / 2;
    cube.position.x = Math.round(mathRandom());
    cube.position.z = Math.round(mathRandom());
    
    floor.position.set(cube.position.x, 0/*floor.scale.y / 2*/, cube.position.z)
    
    town.add(floor);
    town.add(cube);

    cubes.push(cube);
    floors.push(floor);
  };
  createLights();
  createGridHelper();

  // register tall-enough buildings as ball containers (world == local: city/town are unrotated at the origin)
  cubes.forEach(function (c) {
    const top = c.scale.y / 2;
    if (top < 0.5) return; // too short to hold anything — balls just bounce off it
    buildings.push({
      mesh: c,
      cx: c.position.x,
      cz: c.position.z,
      hx: c.scale.x / 2,
      hz: c.scale.z / 2,
      top: top,
      capacity: Math.max(4, Math.min(30, Math.round(top * 5))),
      contained: [],
      glassified: false,
      popped: false,
    });
  });
  tallestTop = buildings.reduce((m, b) => Math.max(m, b.top), 0);

  //----------------------------------------------------------------- Particular
  

  var gmaterial = new THREE.MeshToonMaterial({color:currentColors.particleColor, side:THREE.DoubleSide});
  var gparticular = new THREE.CircleGeometry(0.01, 3);
  var aparticular = 5;
  
  for (var h = 1; h<300; h++) {
    var particular = new THREE.Mesh(gparticular, gmaterial);
    particular.name = "particles";
    particular.position.set(mathRandom(aparticular), mathRandom(aparticular),mathRandom(aparticular));
    particular.rotation.set(mathRandom(),mathRandom(),mathRandom());
    smoke.add(particular);
  };
  
  var pmaterial = new THREE.MeshPhongMaterial({
    color:currentColors.groundColor,// change later
    side:THREE.DoubleSide,
    opacity:0.9,
    transparent:true});
  var pgeometry = new THREE.PlaneGeometry(60,60);
  var pelement = new THREE.Mesh(pgeometry, pmaterial);
  pelement.rotation.x = -90 * Math.PI / 180;
  pelement.position.y = -0.001;
  pelement.receiveShadow = true;
  // pelement.material.emissive.setHex(0xFFFFFF + Math.random() * 100000);
  pelement.name = "ground";
  groundMesh = pelement;

  city.add(pelement);
};

//----------------------------------------------------------------- MOUSE function


function onMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  recomputeColors();

  // bloom effects
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(camera.children, false);
  if (intersects.length > 0) {
    const object = intersects[0].object;
    intersectingObject = object;
    document.body.style.cursor = 'pointer';
    // console.log('object:', object)
    // put in a bloom scene for each sphere later
    // object.layers.enable(BLOOM_SCENE);
  } else {
    document.body.style.cursor = 'crosshair';
    intersectingObject = null;
  }

};
function onDocumentTouchStart( event ) {
  if ( event.touches.length === 1 ) {
    event.preventDefault();
    mouse.x = event.touches[ 0 ].pageX -  window.innerWidth / 2;
    mouse.y = event.touches[ 0 ].pageY - window.innerHeight / 2;
  };
};
function onDocumentTouchMove( event ) {
  if ( event.touches.length === 1 ) {
    event.preventDefault();
    mouse.x = event.touches[ 0 ].pageX -  window.innerWidth / 2;
    mouse.y = event.touches[ 0 ].pageY - window.innerHeight / 2;
  }
}

function recomputeColors() {
  const threeFogColor = new THREE.Color(currentColors.fogColor);
  scene.fog.color = threeFogColor;
  scene.background = threeFogColor;

  const mouseYPercentage = ((mouse.y + 1) / 2) * 100;
  changeColorByMouseY(mouseYPercentage);

  const particles: THREE.Mesh = scene.getObjectByName("particles");
  const particlesMaterial: THREE.MeshToonMaterial = particles.material;
  particlesMaterial.color.setHex(strToHex(currentColors.particleColor));
  
  const ground: THREE.Mesh = scene.getObjectByName("ground");
  const groundMaterial: THREE.MeshPhongMaterial = ground.material;
  groundMaterial.color.setHex(strToHex(currentColors.groundColor));

  // const cubeObj: THREE.Mesh = scene.getObjectByName("cubeobj");
  cubes.forEach(cube => {
    const cubeObjMaterial: THREE.MeshStandardMaterial = cube.material;
    cubeObjMaterial.color.setHex(strToHex(currentColors.buildingColor));
  });
  floors.forEach(floor => {
    const floorObj: THREE.MeshStandardMaterial = floor.material;
    floorObj.color.setHex(strToHex(currentColors.buildingColor));
  })
  lines.forEach(line => {
    const lineObj: THREE.MeshToonMaterial = line.material;
    lineObj.color.setHex(strToHex(currentColors.lineColor));
  })
}

//----------------------------------------------------------------- Lights
var createLights = function() {

  var ambientLight = new THREE.AmbientLight(0xFFFFFF, 4);
  var lightFront = new THREE.SpotLight(0xFFFFFF, 20, 10);
  var lightBack = new THREE.PointLight(0xFFFFFF, 0.5);

  lightFront.rotation.x = 45 * Math.PI / 180;
  lightFront.rotation.z = -45 * Math.PI / 180;
  lightFront.position.set(5, 5, 5);
  lightFront.castShadow = true;
  lightFront.shadow.mapSize.width = 2048;
  lightFront.shadow.mapSize.height = lightFront.shadow.mapSize.width;
  lightFront.penumbra = 0.1;
  lightBack.position.set(0,6,0);

  smoke.position.y = 2;

  scene.add(ambientLight);
  city.add(lightFront);
  scene.add(lightBack);
  scene.add(city);
  city.add(smoke);
  city.add(town);
}
  //----------------------------------------------------------------- GRID Helper
var createGridHelper = function() {
  var gridHelper = new THREE.GridHelper( 60, 120, 0x000000, 0x000000);
  city.add( gridHelper );
}

//----------------------------------------------------------------- LINES world

var createCars = function(cScale = 2, cPos = 20, cColor = currentColors.lineColor) {
  var cMat = new THREE.MeshToonMaterial({color:cColor, side:THREE.DoubleSide});
  var cGeo = new THREE.BoxGeometry(1, cScale/40, cScale/40);
  var cElem = new THREE.Mesh(cGeo, cMat);
  var cAmp = 3;
  
  if (createCarPos) {
    createCarPos = false;
    cElem.position.x = -cPos;
    cElem.position.z = (mathRandom(cAmp));

    TweenMax.to(cElem.position, 18, {x:cPos, repeat:-1, yoyo:true, delay:mathRandom(3)});
  } else {
    createCarPos = true;
    cElem.position.x = (mathRandom(cAmp));
    cElem.position.z = -cPos;
    cElem.rotation.y = 90 * Math.PI / 180;
  
    TweenMax.to(cElem.position, 25, {z:cPos, repeat:-1, yoyo:true, delay:mathRandom(3), ease:Power1.easeInOut});
  };
  cElem.receiveShadow = true;
  cElem.castShadow = true;
  cElem.position.y = Math.abs(mathRandom(5));
  city.add(cElem);
  lines.push(cElem);
};

var generateLines = function() {
  for (var i = 0; i<60; i++) {
    createCars(0.1, 20);
  };
};

//----------------------------------------------------------------- SPHERES

var createSpheres = function() {
  cubeRenderTarget = new THREE.WebGLCubeRenderTarget(isLowEndDevice ? 128 : 256);
  cubeRenderTarget.texture.type = THREE.HalfFloatType;
  cubeCamera = new THREE.CubeCamera(0.5, 100, cubeRenderTarget);
  // look in the same direction as the main camera
  cubeCamera.applyQuaternion(new THREE.Quaternion(0, 1, 0, 0));
  // bring camera closer
  cubeCamera.position.setZ(-4);

  const sphereMaterial = new THREE.MeshStandardMaterial({
    envMap: cubeRenderTarget.texture,
    // envMapIntensity: 2,
    roughness: 0,
    metalness: 1
  });
  
  sphere1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 8), sphereMaterial);
  sphere1.position.set(0, ORB_Y, -5);
  sphere1.layers.enable(BLOOM_SCENE);
  camera.add(sphere1);
  sphere1.add(cubeCamera);
}
createSpheres();

//----------------------------------------------------------------- Bloom controls

function darkenNonBloomed( obj ) {
  if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
    // console.log('darkening', obj)
    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
  // darken fog as it isn't affected as a child of the scene in the same way that the other objects are
  // materials['fog'] = scene.fog;
  scene.fog = noFog;
}

function restoreDarkenedNonBloomedMaterial(obj) {
  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }
  // restore fog
  // scene.fog = materials['fog'];
  scene.fog = sceneFog;
  // delete materials['fog'];
}

function setupListeners() {
  window.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('touchstart', onDocumentTouchStart, false );
  window.addEventListener('touchmove', onDocumentTouchMove, false );
  window.addEventListener( 'wheel', onMouseWheel, false );
  window.addEventListener('click', onPointerClick, false);
  window.addEventListener('touchend', onPointerClick, false);
}

//----------------------------------------------------------------- ANIMATE

function onMouseWheel(e) {
  // const rotationDelta = +e.wheelDeltaY / 500;

  // for (let i=0, l=town.children.length; i < l; i ++) {
  //   var object = town.children[i];
  //   if (object.rotation.y >= 0 && object.rotation.y <= 0.5) {
  //     console.log(object.rotation.y)
  //     object.scale.y += e.wheelDeltaY / 10000;
  //     object.rotation.y += Math.min(Math.max(rotationDelta * Math.PI / 180, 0), 0.5);
  //     object.rotation.z += Math.min(Math.max(rotationDelta * Math.PI / 180, 0), 0.5);
  //   }
  // }
}

function moveSphere() {
  const currentTime = elapsedTime * 2.5;
  sphere1.position.y = ORB_Y + Math.sin(currentTime) * 0.005;
}

var animate = function() {
  frameCount++;
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsedTime += dt;

  // the city no longer rotates with the mouse (the view is a fixed overhead angle);
  // only the particle cloud drifts gently for life
  smoke.rotation.y += 0.002;
  smoke.rotation.x += 0.002;

  updatePhysics(dt);
  moveSphere();

  camera.lookAt(0, 1.5, 0);

  // the reflective orb re-renders the whole scene 6x — throttle it for old machines
  const cubeInterval = isLowEndDevice ? 4 : 2;
  if (frameCount % cubeInterval === 0) {
    cubeCamera.update(renderer, scene);
  }

  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreDarkenedNonBloomedMaterial);

  // dynamic bloom controls
  bloomPass.strength = bloomSettings.strength;
  bloomPass.radius = bloomSettings.radius;
  bloomPass.threshold = bloomSettings.threshold;

  if (intersectingObject != null && bloomSettings.strength < bloomSettings.maxStrength) {
    bloomSettings.strength += bloomSettings.strengthDelta;
  } else if (bloomSettings.strength > 0) {
    bloomSettings.strength -= bloomSettings.strengthDelta;
  }

  finalComposer.render();
  requestAnimationFrame(animate);
}

//----------------------------------------------------------------- BOUNCY BALLS

// click the orb -> open LinkedIn; click anywhere else -> drop a few bouncy balls
function onPointerClick(event) {
  const pt = event.changedTouches ? event.changedTouches[0] : event;
  if (pt.clientX === undefined) return;
  const ndc = new THREE.Vector2(
    (pt.clientX / window.innerWidth) * 2 - 1,
    -(pt.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);

  // the reflective orb is a child of the camera
  const orbHit = raycaster.intersectObjects(camera.children, true);
  if (orbHit.length > 0) {
    window.open(LINKEDIN_URL, '_blank', 'noopener,noreferrer');
    return;
  }

  // otherwise rain balls down onto wherever the click lands on the ground plane
  if (!groundMesh) return;
  const hit = raycaster.intersectObject(groundMesh, false);
  if (hit.length > 0) {
    spawnBalls(hit[0].point.x, hit[0].point.z, BALLS_PER_CLICK);
  }
}

function spawnBalls(x, z, count) {
  // drop in from roughly the height of the tallest building
  const dropY = tallestTop;
  for (let i = 0; i < count; i++) {
    if (balls.length >= MAX_BALLS) {
      const old = balls.shift();
      scene.remove(old.mesh);
      if (old.home) {
        const idx = old.home.contained.indexOf(old);
        if (idx >= 0) old.home.contained.splice(idx, 1);
      }
    }
    const color = new THREE.Color(BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]);
    // metallic neon: a fully-metal surface reflects the city's cube map (so it won't blow
    // out to white under the bright ambient light), tinted by the ball's colour, with a
    // touch of self-emission so the hue always reads. Reuses the orb's existing env map —
    // cheap, no per-ball glow/bloom pass.
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.18,
      metalness: 1,
      envMap: cubeRenderTarget ? cubeRenderTarget.texture : null,
      envMapIntensity: 1.6,
    });
    const mesh = new THREE.Mesh(ballGeo, mat);
    mesh.castShadow = true;
    const ball = {
      mesh: mesh,
      pos: new THREE.Vector3(
        x + (Math.random() - 0.5) * 0.7,
        dropY + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 0.7
      ),
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5),
      prevY: dropY,
      home: null,
    };
    mesh.position.copy(ball.pos);
    scene.add(mesh);
    balls.push(ball);
  }
}

function inFootprint(b, B) {
  return (
    b.pos.x > B.cx - B.hx - BALL_R &&
    b.pos.x < B.cx + B.hx + BALL_R &&
    b.pos.z > B.cz - B.hz - BALL_R &&
    b.pos.z < B.cz + B.hz + BALL_R
  );
}

function glassify(B) {
  if (B.glassified) return;
  B.glassified = true;
  // reveal the balls accumulating inside by turning the building to glass
  B.mesh.material.transparent = true;
  B.mesh.material.opacity = 0.32;
  B.mesh.material.needsUpdate = true;
}

function enterBuilding(b, B) {
  b.home = B;
  B.contained.push(b);
  glassify(B);
  if (b.pos.y > B.top - BALL_R) b.pos.y = B.top - BALL_R;
}

function confineToBuilding(b, B) {
  const minX = B.cx - B.hx + BALL_R, maxX = B.cx + B.hx - BALL_R;
  const minZ = B.cz - B.hz + BALL_R, maxZ = B.cz + B.hz - BALL_R;
  if (b.pos.x < minX) { b.pos.x = minX; b.vel.x = Math.abs(b.vel.x) * RESTITUTION; }
  else if (b.pos.x > maxX) { b.pos.x = maxX; b.vel.x = -Math.abs(b.vel.x) * RESTITUTION; }
  if (b.pos.z < minZ) { b.pos.z = minZ; b.vel.z = Math.abs(b.vel.z) * RESTITUTION; }
  else if (b.pos.z > maxZ) { b.pos.z = maxZ; b.vel.z = -Math.abs(b.vel.z) * RESTITUTION; }
}

function pushOutOfBox(b, B) {
  const overlapX = (B.hx + BALL_R) - Math.abs(b.pos.x - B.cx);
  const overlapZ = (B.hz + BALL_R) - Math.abs(b.pos.z - B.cz);
  if (overlapX < overlapZ) {
    const dir = b.pos.x > B.cx ? 1 : -1;
    b.pos.x = B.cx + dir * (B.hx + BALL_R);
    b.vel.x = dir * Math.abs(b.vel.x) * RESTITUTION;
  } else {
    const dir = b.pos.z > B.cz ? 1 : -1;
    b.pos.z = B.cz + dir * (B.hz + BALL_R);
    b.vel.z = dir * Math.abs(b.vel.z) * RESTITUTION;
  }
}

function collideFree(b) {
  const bottom = b.pos.y - BALL_R;
  const prevBottom = b.prevY - BALL_R;

  // 1) landing on / smashing through a roof — pick the highest roof crossed this step
  let roofB = null;
  for (let i = 0; i < buildings.length; i++) {
    const B = buildings[i];
    if (B.popped || !inFootprint(b, B)) continue;
    if (b.vel.y <= 0 && prevBottom >= B.top - 0.02 && bottom <= B.top) {
      if (!roofB || B.top > roofB.top) roofB = B;
    }
  }
  if (roofB) {
    if (-b.vel.y > SMASH_SPEED) {
      enterBuilding(b, roofB);
    } else {
      b.pos.y = roofB.top + BALL_R;
      b.vel.y = -b.vel.y * RESTITUTION;
      b.vel.x *= 0.92;
      b.vel.z *= 0.92;
    }
    return;
  }

  // 2) bouncing off the side of a building it can't be on top of
  let sideB = null;
  for (let i = 0; i < buildings.length; i++) {
    const B = buildings[i];
    if (B.popped || !inFootprint(b, B)) continue;
    if (bottom < B.top && b.pos.y + BALL_R > 0) {
      if (!sideB || B.top > sideB.top) sideB = B;
    }
  }
  if (sideB) pushOutOfBox(b, sideB);
}

function resolveBallBall(list) {
  const min = BALL_R * 2;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], c = list[j];
      const dx = c.pos.x - a.pos.x, dy = c.pos.y - a.pos.y, dz = c.pos.z - a.pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < min * min && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d, nz = dz / d;
        const pen = (min - d) * 0.5;
        a.pos.x -= nx * pen; a.pos.y -= ny * pen; a.pos.z -= nz * pen;
        c.pos.x += nx * pen; c.pos.y += ny * pen; c.pos.z += nz * pen;
        const vn = (c.vel.x - a.vel.x) * nx + (c.vel.y - a.vel.y) * ny + (c.vel.z - a.vel.z) * nz;
        if (vn < 0) {
          const imp = -(1 + RESTITUTION) * vn * 0.5;
          a.vel.x -= imp * nx; a.vel.y -= imp * ny; a.vel.z -= imp * nz;
          c.vel.x += imp * nx; c.vel.y += imp * ny; c.vel.z += imp * nz;
        }
      }
    }
  }
}

function popBuilding(B) {
  B.popped = true;
  town.remove(B.mesh);
  // the building bursts — fling its contents out to scatter and roll away
  for (let k = 0; k < B.contained.length; k++) {
    const b = B.contained[k];
    b.home = null;
    const ang = Math.random() * Math.PI * 2;
    const sp = 2.5 + Math.random() * 4;
    b.vel.set(Math.cos(ang) * sp, 3 + Math.random() * 4.5, Math.sin(ang) * sp);
    b.pos.y = Math.max(b.pos.y, BALL_R + 0.05);
  }
  B.contained = [];
}

function updatePhysics(dt) {
  if (dt <= 0) return;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.prevY = b.pos.y;
    b.vel.y -= GRAVITY * dt;
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.pos.z += b.vel.z * dt;

    if (b.home && !b.home.popped) {
      confineToBuilding(b, b.home);
    } else {
      b.home = null;
      collideFree(b);
    }

    // ground plane
    if (b.pos.y - BALL_R < 0) {
      b.pos.y = BALL_R;
      if (b.vel.y < 0) b.vel.y = -b.vel.y * RESTITUTION;
      b.vel.x *= GROUND_FRICTION;
      b.vel.z *= GROUND_FRICTION;
      if (Math.abs(b.vel.y) < 0.35) b.vel.y = 0;
    }

    b.mesh.position.copy(b.pos);
  }

  // settle stacks inside each building, and burst the full ones
  for (let i = 0; i < buildings.length; i++) {
    const B = buildings[i];
    if (B.popped) continue;
    if (B.contained.length > 1) resolveBallBall(B.contained);
    if (B.contained.length >= B.capacity) popBuilding(B);
  }
}

//----------------------------------------------------------------- START functions
export default function StartThreeJS(cityRef: any) {
  setupScene(cityRef);
  setupListeners();
  generateLines();
  init(cityRef);
  animate();
}
// });