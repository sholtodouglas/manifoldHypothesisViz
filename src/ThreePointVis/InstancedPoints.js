import * as React from 'react';
import * as THREE from 'three';
import { useAnimatedLayout } from './layouts';
import { a } from 'react-spring/three';

// re-use for instance computations
const scratchObject3D = new THREE.Object3D();

function updateInstancedMeshMatrices({ mesh, data }) {
  if (!mesh) return;

  // set the transform matrix for each instance
  for (let i = 0; i < data.length; ++i) {
    const { x, y, z } = data[i];

    scratchObject3D.position.set(x, y, z);
    scratchObject3D.rotation.set(0.5 * Math.PI, 0, 0); // cylinders face z direction
    scratchObject3D.updateMatrix();
    mesh.setMatrixAt(i, scratchObject3D.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

const SELECTED_COLOR = '#E74C3C';
const DEFAULT_COLOR = '#2E86C1';

// re-use for instance computations
const scratchColor = new THREE.Color();

const usePointColors = ({ data, labels, selectedPoint }) => {
  const numPoints = data.length;
  const colorAttrib = React.useRef();
  const colorArray = React.useMemo(() => new Float32Array(numPoints * 3), [
    numPoints,
  ]);
  // console.log(labels)
  React.useEffect(() => {
    for (let i = 0; i < data.length; ++i) {
      scratchColor.set(
        labels[i] === 1 ? SELECTED_COLOR : DEFAULT_COLOR
      );
      scratchColor.toArray(colorArray, i * 3);
    }
    colorAttrib.current.needsUpdate = true;
  }, [data, selectedPoint, colorArray]);

  return { colorAttrib, colorArray };
};

const useMousePointInteraction = ({ data, selectedPoint, onSelectPoint }) => {
  // track mousedown position to skip click handlers on drags
  const mouseDownRef = React.useRef([0, 0]);
  const handlePointerDown = e => {
    mouseDownRef.current[0] = e.clientX;
    mouseDownRef.current[1] = e.clientY;
  };

  const handleClick = event => {
    const { instanceId, clientX, clientY } = event;
    const downDistance = Math.sqrt(
      Math.pow(mouseDownRef.current[0] - clientX, 2) +
        Math.pow(mouseDownRef.current[1] - clientY, 2)
    );

    // skip click if we dragged more than 5px distance
    if (downDistance > 5) {
      event.stopPropagation();
      return;
    }

    // index is instanceId if we never change sort order
    const index = instanceId;
    const point = data[index];

    // console.log('got point =', point);
    // toggle the point
    if (point === selectedPoint) {
      onSelectPoint(point);
    } else {
      // console.log(point)
      onSelectPoint(point);
    }
  };

  return { handlePointerDown, handleClick };
};

const InstancedPoints = ({ data, labels, layout, selectedPoint, onSelectPoint, modelOutputs}) => {
  const meshRef = React.useRef();
  const numPoints = data.length;

  // run the layout, animating on change
  const { animationProgress } = useAnimatedLayout({
    data,
    layout,
    onFrame: () => {
      updateInstancedMeshMatrices({ mesh: meshRef.current, data });
    },
    modelOutputs
  });

  // update instance matrices only when needed
  React.useEffect(() => {
    updateInstancedMeshMatrices({ mesh: meshRef.current, data });
  }, [data, layout]);

  const { handleClick, handlePointerDown } = useMousePointInteraction({
    data,
    selectedPoint,
    onSelectPoint,
  });


  

  const { colorAttrib, colorArray } = usePointColors({ data, labels, selectedPoint });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[null, null, numPoints]}
        frustumCulled={false}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      >
        <sphereBufferGeometry attach="geometry" args={[0.005, 0.005, 0.005]}>
          <instancedBufferAttribute
            ref={colorAttrib}
            attachObject={['attributes', 'color']}
            args={[colorArray, 3]}
          />
        </sphereBufferGeometry>
        <meshStandardMaterial
          attach="material"
          vertexColors={THREE.VertexColors}
        />
      </instancedMesh>
      {selectedPoint && (
        <a.group
          position={animationProgress.interpolate(() => [
            selectedPoint.x,
            selectedPoint.y,
            selectedPoint.z,
          ])}
        >
          <pointLight
            distance={0.9}
            position={[0, 0, 0.3]}
            intensity={0.2}
            decay={30}
            color="#3f3"
          />
          <pointLight
            position={[0, 0, 0]}
            decay={1}
            distance={0.5}
            intensity={1.0}
            color="#2f0"
          />
        </a.group>
      )}
    </>
  );
};

export default InstancedPoints;
