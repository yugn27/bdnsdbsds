import { GLTFLoader } from "../three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "../three/build/three.module.js";
import { ARButton } from "../src/ARButton.js";

let container;
let camera, scene, renderer;
let controller;
let index = 0; //Variable storing index of selected Items.
let hitTestResults;
let ItemInfo = {
  button1: "./static/Models/Chair1/Chair1.gltf",
  button2: "./static/Models/Chair/Chair.gltf",
  button3: "./static/Models/Stool/Stool.gltf",
};
let selectedItemURL = ItemInfo.button1;
let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;
let selectedObject = null;
let spawwnedObjects = [];

let isBlockingUI = false;

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  //Selection Function
  var mesh;

  //On Select Function
  function onSelect() {
    if (!isBlockingUI) {
      if (reticle.visible && selectedItemURL != "") {
        loader.load(
          selectedItemURL,
          function (LoadModel) {
            selectedItemURL = "";
            mesh = LoadModel.scene;
            mesh.position.setFromMatrixPosition(reticle.matrix);
            scene.add(mesh);
            spawwnedObjects.push(mesh);
            selectedObject = mesh;
            if (spawwnedObjects.length) {
              spawwnedObjects.forEach(element => {
                if (element === selectedObject) {
                  element.traverse((child) => {
                    if (child.isMesh) {
                      child.material.opacity = 1;
                    }
                  })
                } else {
                  element.traverse((child) => {
                    if (child.isMesh) {
                      child.material.opacity = 0.4;
                    }
                  })
                }
              });
            }
          },
          undefined,
          function (OnError) {
            console.log("Error " + OnError);
          }
        );
      }
    }
  }

  //Selection
  const previousButton = document.getElementById("Previous");
  const nextButton = document.getElementById("Next");

  function OnpreviousButtonClick() {
    if (spawwnedObjects.length) {
      let previousIndex = spawwnedObjects.indexOf(selectedObject);
      index = (previousIndex - 1) % spawwnedObjects.length;
      selectedObject = spawwnedObjects[index];
      selectedObject.traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = 1;
        }
      })
      spawwnedObjects[previousIndex].traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = 0.4;
        }
      })
    }
  }

  previousButton.addEventListener("click", OnpreviousButtonClick);

  function OnNextButtonClick() {
    if (spawwnedObjects.length) {
      let previousIndex = spawwnedObjects.indexOf(selectedObject);
      index = (previousIndex + 1) % spawwnedObjects.length;
      selectedObject = spawwnedObjects[index];
      selectedObject.traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = 1;
        }
      })
      spawwnedObjects[previousIndex].traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = 0.4;
        }
      })
    }
  }

  nextButton.addEventListener("click", OnNextButtonClick);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);

  //Reticle
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.10, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener("resize", onWindowResize);
}


const loader = new GLTFLoader();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}

let Buttons = document.getElementsByClassName("buttons");
function BindingSelectionEvent() {
  for (let i = 0; i < Buttons.length; i++) {
    Buttons[i].addEventListener("click", () => {
      selectedItemURL = ItemInfo[Buttons[i].id];
    });
  }
}

//UI blocking Function
function BlockUI() {
  for (let i = 0; i < Buttons.length; i++) {
    Buttons[i].addEventListener(onmouseenter, () => {
      isBlockingUI = true;
    });

    Buttons[i].addEventListener(onmouseleave, () => {
      isBlockingUI = false;
    });
  }
}

BlockUI();

//Object Selection
let Colors = {
  0: "0xff0000",
  1: "0x00ff00",
  2: "0x0000ff",
  3: "0xffff00",
};

let materialColor = document.getElementsByClassName("colors");
for (let i = 0; i < materialColor.length; i++) {
  materialColor[i].addEventListener("click", () => {
    if (selectedObject != null) {
      selectedObject.traverse((child) => {
        if (child.isMesh) {
          child.material.color.setHex(Colors[i]);
        }
      });
      selectedObject.material.needsUpdate = true;
    }
  });
}

let HeightSlider = document.getElementById("HeightSlider");
console.log(HeightSlider);
HeightSlider.addEventListener("change", () => {
  if (selectedObject != null) {
    selectedObject.scale.y = [HeightSlider.value];
    selectedObject.matrixAutoUpdate = true;
  }
});
let widthSlider = document.getElementById("WidthSlider");
widthSlider.addEventListener("change", () => {
  if (selectedObject != null) {
    selectedObject.scale.x = [widthSlider.value];
    selectedObject.matrixAutoUpdate = true;
  }
});

BindingSelectionEvent();
init();
animate();
