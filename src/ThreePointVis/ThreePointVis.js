import * as React from 'react';
import { Canvas } from 'react-three-fiber';
import Controls from './Controls';
import InstancedPoints from './InstancedPoints';
import Effects from './Effects';
import { AxesHelper } from 'three';

const ThreePointVis = ({ data, labels, layout, selectedPoint, onSelectPoint, modelOutputs}, ref) => {
  const controlsRef = React.useRef();
  React.useImperativeHandle(ref, () => ({
    resetCamera: () => {
      return controlsRef.current.resetCamera();
    },
  }));

  // console.log('thrreepoint', layout)

  return (
    <Canvas camera={{ position: [0, 0, 2], far: 15000 }}>
      <Controls ref={controlsRef} />
      <ambientLight color="#ffffff" intensity={0.1} />
      <hemisphereLight
        color="#ffffff"
        skyColor="#ffffbb"
        groundColor="#080820"
        intensity={1.0}
      />
      <InstancedPoints
        data={data}
        labels={labels}
        layout={layout}
        selectedPoint={selectedPoint}
        onSelectPoint={onSelectPoint}
        modelOutputs={modelOutputs}
      />
      <Effects />
      <axesHelper/>
    </Canvas>
  );
};

export default React.forwardRef(ThreePointVis);
