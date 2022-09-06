// @ts-nocheck

import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { TweenMax, Power1 } from 'gsap';
import tinycolor from 'tinycolor2';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Stats from 'stats.js';

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
const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
var camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 1, 500 );

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
var uSpeed;

var stats;


function waitForElm(selector) {
  return new Promise(resolve => {
      if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(mutations => {
          if (document.querySelector(selector)) {
              resolve(document.querySelector(selector));
              observer.disconnect();
          }
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
  });
}



// Three JS Template
//----------------------------------------------------------------- BASIC parameters

// waitForElm('#city').then((elm) => {

function invertHex(hex) {
  const hexCopy = hex;
  return (Number(`0x1${hexCopy}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()
}

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
  return hex.length == 1 ? "0" + hex : hex;
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
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize( window.innerWidth, window.innerHeight );

  if (window.innerWidth > 800) {
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

  camera.position.set(0, 2, 14);

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
  uSpeed = 0.001;

  //----------------------------------------------------------------- FOG background

  scene.background = new THREE.Color(currentColors.fogColor);
  scene.fog = sceneFog;
  // scene.fog = new THREE.FogExp2(setcolor, 0.05);

}
//----------------------------------------------------------------- RANDOM Function
function mathRandom(num = 8) {
  var numValue = - Math.random() * num + Math.random() * num;
  return numValue;
};

//----------------------------------------------------------------- CREATE City

function init() {

  // STATS

  stats = new Stats();
  stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

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
    var wire = new THREE.Mesh(geometry, wmaterial);
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
    roughness: 10,
    metalness: 0.6,
    opacity:0.9,
    transparent:true});
  var pgeometry = new THREE.PlaneGeometry(60,60);
  var pelement = new THREE.Mesh(pgeometry, pmaterial);
  pelement.rotation.x = -90 * Math.PI / 180;
  pelement.position.y = -0.001;
  pelement.receiveShadow = true;
  // pelement.material.emissive.setHex(0xFFFFFF + Math.random() * 100000);
  pelement.name = "ground";

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
    document.body.style.cursor = 'unset';
    intersectingObject = null;
  }

};
function onDocumentTouchStart( event ) {
  if ( event.touches.length == 1 ) {
    event.preventDefault();
    mouse.x = event.touches[ 0 ].pageX -  window.innerWidth / 2;
    mouse.y = event.touches[ 0 ].pageY - window.innerHeight / 2;
  };
};
function onDocumentTouchMove( event ) {
  if ( event.touches.length == 1 ) {
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

  var spotLightHelper = new THREE.SpotLightHelper( lightFront );
  //scene.add( spotLightHelper );

  lightFront.rotation.x = 45 * Math.PI / 180;
  lightFront.rotation.z = -45 * Math.PI / 180;
  lightFront.position.set(5, 5, 5);
  lightFront.castShadow = true;
  lightFront.shadow.mapSize.width = 6000;
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

//----------------------------------------------------------------- CAR world
var generateCar = function() {
  
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

//----------------------------------------------------------------- CAMERA position

var cameraSet = function() {
  createCars(0.1, 20, 0xFFFFFF);
  //TweenMax.to(camera.position, 1, {y:1+Math.random()*4, ease:Expo.easeInOut})
};

//----------------------------------------------------------------- SPHERES

var createSpheres = function() {
  cubeRenderTarget = new THREE.WebGLCubeRenderTarget(500);
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
  
  sphere1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 8), sphereMaterial);
  sphere1.position.set(0, 0, -5);
  sphere1.layers.enable(BLOOM_SCENE);
  console.log('sphere1:', sphere1)
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
}

//----------------------------------------------------------------- ANIMATE

var animate = function() {
  stats.begin();
  
  city.rotation.y -= ((mouse.x * 2) - camera.rotation.y) * uSpeed;
  city.rotation.x -= (-(mouse.y * 2) - camera.rotation.x) * uSpeed;
  if (city.rotation.x < -0.05) city.rotation.x = -0.05;
  else if (city.rotation.x>1) city.rotation.x = 1;
  var cityRotation = Math.sin(Date.now() / 5000) * 13;
  //city.rotation.x = cityRotation * Math.PI / 180;
  
  //console.log(city.rotation.x);
  //camera.position.y -= (-(mouse.y * 20) - camera.rotation.y) * uSpeed;;
  
  // rotate the buildings?
  for ( let i = 0, l = town.children.length; i < l; i ++ ) {
    var object = town.children[ i ];
    //object.scale.y = Math.sin(time*50) * object.rotationValue;
    //object.rotation.y = (Math.sin((time/object.rotationValue) * Math.PI / 180) * 180);
    //object.rotation.z = (Math.cos((time/object.rotationValue) * Math.PI / 180) * 180);
  }
  
  smoke.rotation.y += 0.002;
  smoke.rotation.x += 0.002;

  camera.lookAt(city.position);
  cubeCamera.update(renderer, scene);
  cubeCamera.lookAt(city.position);

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
  // renderer.render(scene, camera);
  
  stats.end();
  requestAnimationFrame(animate);
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