import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei/core";
import { useRef, useEffect, useLayoutEffect, useState } from "react";

import { BsFillRecordCircleFill } from "react-icons/bs";
import Model from "./Model";
import { Vector3 } from "three";
import { landmarks } from "./Landmark";
import * as THREE from "three";

function App() {
  const [acitveLandmark, setActiveLandmark] = useState(false);
  const light = useRef();
  const [selectedLandmark, setSelectedLandmark] = useState("");
  const visitedLandmarks = useRef([]);
  const [AxisLines, setAxisLines] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [varus, setVarus] = useState(0);
  const [valrusPlaneGenerated, setValrusPlaneGenerated] = useState(false);
  const [updated, setUpdated] = useState(false);

  const pointGeo = new THREE.SphereGeometry(5, 16, 16);
  const pointMat = new THREE.MeshBasicMaterial({ color: "red" });
  const pointMesh = new THREE.Mesh(pointGeo, pointMat);

  const [rotationAxisAnterior, setRotationAxisAnterior] = useState(
    new THREE.Vector3()
  );

  const [rotationAxisLateral, setRotationAxisLateral] = useState(
    new THREE.Vector3()
  );

  const updateLandmarkLocation = (position, name) => {
    const landmark = landmarks.find((obj) => obj.name === name);
    if (landmark) {
      landmark.position = position;
      visitedLandmarks.current.push(landmark.name);
    } else {
      console.log("did not find landmark", name);
    }
    console.log(landmarks);
  };

  const generatePlane = (points, directionPoints, center, material) => {
    const planeGeometry = new THREE.PlaneGeometry(150, 150);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });

    //direction vectors
    const direction = new THREE.Vector3()
      .subVectors(directionPoints[0], directionPoints[1])
      .normalize();

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    plane.lookAt(direction);
    plane.position.copy(center.position);

    setPlanes((prev) => [...prev, plane]);

    const projectionPointArray = projectLineOnPlane(
      points[0],
      points[1],
      plane,
      material,
      direction
    );

    const projectedPoint1 = projectionPointArray[0];
    const projectedPoint2 = projectionPointArray[1];

    // //draw Anterior line

    const projectedLineDirection = new THREE.Vector3()
      .subVectors(projectedPoint1, projectedPoint2)
      .normalize();
    const perpendicularLineDirection = new THREE.Vector3(
      -projectedLineDirection.y,
      projectedLineDirection.x,
      projectedLineDirection.z
    );
    drawLineWithPlaneAndDir(
      perpendicularLineDirection,
      plane,
      "Anterior",
      material
    );
  };

  const updateAxis = (landmarkArray) => {
    const femmurCenterPoint = landmarkArray.find(
      (obj) => obj.name === "Femur Center"
    );

    const hipCenterPoint = landmarkArray.find(
      (obj) => obj.name === "Hip Center"
    );

    const femmurProximalCanalPoint = landmarkArray.find(
      (obj) => obj.name === "Femur Proximal Canal"
    );

    const femmurDistalCanalPoint = landmarkArray.find(
      (obj) => obj.name === "Femur Distal Canal"
    );

    const medialEpicondylePoint = landmarkArray.find(
      (obj) => obj.name === "Medial Epicondyle"
    );

    const lateralEpicondylePoint = landmarkArray.find(
      (obj) => obj.name === "Lateral Epicondyle"
    );
    const posteriorMedialPoint = landmarkArray.find(
      (obj) => obj.name === "Distal Medial Pt"
    );
    const posteriorLateralPoint = landmarkArray.find(
      (obj) => obj.name === "Distal Lateral Pt"
    );

    const mechanicalAxisPoints = [
      femmurCenterPoint.position,
      hipCenterPoint.position,
    ];

    const anatomicalAxisPoints = [
      femmurProximalCanalPoint.position,
      femmurDistalCanalPoint.position,
    ];

    const TEAPoints = [
      medialEpicondylePoint.position,
      lateralEpicondylePoint.position,
    ];

    const PCAPoints = [
      posteriorMedialPoint.position,
      posteriorLateralPoint.position,
    ];

    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff,
      linewidth: 10,
    });
    const mechAxisGeo = new THREE.BufferGeometry().setFromPoints(
      mechanicalAxisPoints
    );
    const anaAxisGeo = new THREE.BufferGeometry().setFromPoints(
      anatomicalAxisPoints
    );

    const TEA = new THREE.BufferGeometry().setFromPoints(TEAPoints);
    const PCA = new THREE.BufferGeometry().setFromPoints(PCAPoints);

    const mechAxisLine = new THREE.Line(mechAxisGeo, material);
    const anaAxisLine = new THREE.Line(anaAxisGeo, material);
    const TEALine = new THREE.Line(TEA, material);
    const PCALine = new THREE.Line(PCA, material);

    setAxisLines([mechAxisLine]);

    //planes
    const secondPlaneMat = new THREE.MeshBasicMaterial({ color: "red" });
    generatePlane(TEAPoints, mechanicalAxisPoints, femmurCenterPoint, material);
    // generatePlane(
    //   TEAPoints,
    //   mechanicalAxisPoints,
    //   femmurCenterPoint,
    //   secondPlaneMat
    // );
  };

  const duplicatePlane = (plane) => {
    const newPlane = plane.clone();
    setPlanes((prev) => [...prev, newPlane]);
  };

  const varusValgus = (change) => {
    const theta = 1 * (Math.PI / 180);

    const rotationQuaternionPlus = new THREE.Quaternion();
    rotationQuaternionPlus.setFromAxisAngle(rotationAxisAnterior, theta);

    const rotationQuaternionMinus = new THREE.Quaternion();
    rotationQuaternionMinus.setFromAxisAngle(rotationAxisAnterior, -theta);
    // Apply the rotation to the plane mesh

    if (valrusPlaneGenerated) {
      if (change === "add") {
        planes[1].applyQuaternion(rotationQuaternionPlus);

        // planes[1].normal.applyMatrix4(rotationMatrix);
      } else {
        planes[1].applyQuaternion(rotationQuaternionMinus);
      }
    }
  };

  const projectLineOnPlane = (point1, point2, plane, material, direction) => {
    const delta1 = new THREE.Vector3().subVectors(point1, plane.position);
    const delta2 = new THREE.Vector3().subVectors(point2, plane.position);

    console.log(delta1, delta2);

    const dotProduct1 = delta1.dot(direction);
    const dotProduct2 = delta2.dot(direction);

    const projection1 = new THREE.Vector3()
      .copy(direction)
      .multiplyScalar(dotProduct1);
    const projection2 = new THREE.Vector3()
      .copy(direction)
      .multiplyScalar(dotProduct2);

    const projectedPoint1 = new THREE.Vector3().subVectors(point1, projection1);

    const projectedPoint2 = new THREE.Vector3().subVectors(point2, projection2);

    const projectionLineGeo = new THREE.BufferGeometry().setFromPoints([
      projectedPoint1,
      projectedPoint2,
    ]);

    const projectionLine = new THREE.Line(projectionLineGeo, material);
    console.log(projectedPoint1);
    setAxisLines((prev) => [...prev, projectionLine]);
    console.log(AxisLines);

    return [projectedPoint1, projectedPoint2];
  };

  const drawLineWithPlaneAndDir = (dir, plane, dirName, material) => {
    const lineVector = new THREE.Vector3().copy(dir).multiplyScalar(60);
    const newLineEndpoint = new THREE.Vector3()
      .copy(plane.position)
      .add(lineVector);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      plane.position,
      newLineEndpoint,
    ]);
    if (dirName === "Lateral") {
      setRotationAxisLateral(
        new THREE.Vector3()
          .subVectors(newLineEndpoint, plane.position)
          .normalize()
      );
    } else if (dirName === "Anterior") {
      setRotationAxisAnterior(
        new THREE.Vector3()
          .subVectors(newLineEndpoint, plane.position)
          .normalize()
      );
    }

    const line = new THREE.Line(lineGeo, material);

    setAxisLines((prev) => [...prev, line]);
  };
  // const createFlexionPlane = () => {
  //   duplicatePlane(planes[1])

  // };

  const drawLateralLine = () => {
    const material = new THREE.MeshBasicMaterial({ color: "red" });
    const originalLine = AxisLines[AxisLines.length - 1];
    console.log(originalLine.geometry);
    const OriginalLinePoint1 = new THREE.Vector3(
      originalLine.geometry.attributes.position.array[0],
      originalLine.geometry.attributes.position.array[1],
      originalLine.geometry.attributes.position.array[2]
    );

    const OriginalLinePoint2 = new THREE.Vector3(
      originalLine.geometry.attributes.position.array[3],
      originalLine.geometry.attributes.position.array[4],
      originalLine.geometry.attributes.position.array[5]
    );
    const originalLineDirection = new THREE.Vector3()
      .subVectors(OriginalLinePoint2, OriginalLinePoint1)
      .normalize();

    const perpendicularDir = new THREE.Vector3(
      -originalLineDirection.y,
      originalLineDirection.x,
      originalLineDirection.z
    );

    drawLineWithPlaneAndDir(perpendicularDir, planes[1], "Lateral", material);
  };

  return (
    <div className="flex relative">
      <div className="h-screen w-[50vw] absolute left-0 z-10 ">
        <div className="h-max w-[50%] bg-black/10 flex flex-col gap-3 p-4">
          {landmarks.map((landmark) => (
            <div
              className="flex gap-2 items-center cursor-pointer"
              onClick={() => {
                if (!visitedLandmarks.current.includes(landmark.name)) {
                  setActiveLandmark(true);
                  setSelectedLandmark(landmark.name);
                }
              }}
            >
              {landmark.name}
              {selectedLandmark == landmark.name ? (
                <div className="text-black">
                  <BsFillRecordCircleFill />
                </div>
              ) : (
                <div className=" text-gray-600">
                  <BsFillRecordCircleFill />
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="h-[40px] w-[100px] bg-white/70 rounded-md text-black flex items-center justify-center cursor-pointer"
          onClick={() => {
            if (!updated) {
              updateAxis(landmarks);
              setUpdated(true);
            }
          }}
        >
          {" "}
          Update
        </div>
        <div
          className="h-[40px] w-[200px] bg-white/70 rounded-md text-black flex items-center justify-center cursor-pointer mt-2"
          onClick={() => {
            drawLateralLine();
          }}
        >
          {" "}
          Generate Lateral Line
        </div>
        <p className="w-max my-3">Varus/Valgus</p>
        <div className="h-[40px] w-[100px] bg-white/70 rounded-md text-black flex items-center justify-evenly ">
          <div
            className="rounded-sm p-2 w-[30px] bg-black/40 h-[30px] flex justify-center items-center  cursor-pointer"
            onClick={() => {
              setVarus(varus - 1);

              if (!valrusPlaneGenerated) {
                setValrusPlaneGenerated(true);
                duplicatePlane(planes[0]);
              }
              varusValgus("reduce");
            }}
          >
            -
          </div>
          {varus}
          <div
            className="rounded-sm p-2 w-[30px] bg-black/40 h-[30px] flex justify-center items-center  cursor-pointer"
            onClick={() => {
              setVarus(varus + 1);

              if (!valrusPlaneGenerated) {
                setValrusPlaneGenerated(true);
                duplicatePlane(planes[0]);
              }
              varusValgus("add");
            }}
          >
            +
          </div>
        </div>
      </div>

      <Canvas
        style={{ height: "100vh", width: "100vw" }}
        camera={{ position: [-100, 200, 900] }}
      >
        <pointLight intensity={7000} position={[0, 10, 900]} />
        <pointLight intensity={7000} position={[0, -200, 900]} />

        <OrbitControls target={new Vector3(-100, 0, 900)} />

        <fog attach="fog" color={0x858585} near={1} far={5000} />

        <Model
          landmark={acitveLandmark}
          updateLandmarkFlag={setActiveLandmark}
          newLandmark={selectedLandmark}
          updateLandmarkLocation={updateLandmarkLocation}
        />

        {AxisLines.map((line) => (
          <primitive object={line} />
        ))}
        {planes.map((plane) => (
          <>
            <primitive object={plane} />
          </>
        ))}
      </Canvas>
    </div>
  );
}

export default App;
