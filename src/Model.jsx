import { useLoader, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { TransformControls } from "@react-three/drei";

const Model = ({
  landmark,
  updateLandmarkFlag,
  newLandmark,
  updateLandmarkLocation,
}) => {
  const femur = useLoader(STLLoader, "/Right_Femur.stl");
  const tibia = useLoader(STLLoader, "/Right_Tibia.stl");
  const { camera } = useThree();
  const modelRef = useRef();
  const [points, setPoints] = useState([]);
  const [activePoint, setActivePoint] = useState();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const pointGeo = new THREE.SphereGeometry(3, 16, 16);
  const pointMat = new THREE.MeshBasicMaterial({ color: "red" });
  const pointMesh = new THREE.Mesh(pointGeo, pointMat);
  const landmarkflag = useRef(landmark);
  const previousLandmark = useRef("");

  useEffect(() => {
    landmarkflag.current = landmark;
  }, [landmark]);

  useEffect(() => {
    if (previousLandmark.current == "") {
      console.log(newLandmark);
      previousLandmark.current = newLandmark;
    } else if (previousLandmark.current != "" && activePoint) {
      updateLandmarkLocation(activePoint.position, previousLandmark.current);
      previousLandmark.current = newLandmark;
    }

    setActivePoint(null);
    console.log(previousLandmark);
  }, [newLandmark]);

  const handleMouseClick = (event, landmark) => {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Intersect the ray with the model's mesh
    const intersects = raycaster.intersectObject(modelRef.current);
    if (landmarkflag.current && intersects.length > 0) {
      console.log("first intersect");
      const point = intersects[0].point.clone();
      const newPoint = pointMesh.clone();
      newPoint.position.set(point.x, point.y, point.z);

      setActivePoint(newPoint);

      setPoints((prevPoints) => [...prevPoints, newPoint]);
      updateLandmarkFlag(false);
    }
  };
  useEffect(() => {
    window.addEventListener("click", handleMouseClick);
    return () => {
      window.removeEventListener("click", handleMouseClick);
    };
  }, []);
  useEffect(() => {
    if (modelRef.current) {
      // modelRef.current.rotation.x = Math.PI / 2;
    }
    console.log(modelRef.current.position);
  }, [modelRef.current]);
  return (
    <>
      <group ref={modelRef}>
        <mesh geometry={femur} position={[0, 0, 0]} scale={1}>
          <meshPhysicalMaterial color="white" />
        </mesh>
        {/* <mesh geometry={tibia} position={[0, 0, 0]} scale={1}>
        <meshPhysicalMaterial color="white" />
      </mesh> */}

        {points.map((point, index) => (
          <>
            {/* <mesh key={index} position={point}>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh> */}
            <primitive object={point} />
          </>
        ))}
        {/* {modelRef.current && <boxHelper args={[modelRef.current, 0xff8657]} />} */}
      </group>
      {activePoint && <TransformControls object={activePoint} />}
    </>
  );
};

export default Model;
