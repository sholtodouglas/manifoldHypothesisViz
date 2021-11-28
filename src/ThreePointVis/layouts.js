import * as React from 'react';
import { useSpring } from 'react-spring/three';

function gridLayout(data) {
  const numPoints = data.length;
  const numCols = Math.ceil(Math.sqrt(numPoints));
  const numRows = numCols;

  for (let i = 0; i < numPoints; ++i) {
    const datum = data[i];
    const col = (i % numCols) - numCols / 2;
    const row = Math.floor(i / numCols) - numRows / 2;

    datum.x = col / numCols;
    datum.y = row / numRows;
    datum.z = 0;
  }
}

function spiralLayout(data) {
  // equidistant points on a spiral
  let theta = 0;
  for (let i = 0; i < data.length; ++i) {
    const datum = data[i];
    let radius = Math.max(1, Math.sqrt(i + 1) * 0.8);
    theta += Math.asin(1 / radius) * 1;

    radius = radius /150;

    datum.x = radius * Math.cos(theta);
    datum.y = radius * Math.sin(theta);
    datum.z = 0;
  }
}


function circleLayout(data) {
  // equidistant points on a spiral
  let theta = 0;
  let numPoints = data.length;
  let loops = 10;

  for (let i = 0; i < numPoints; ++i) {
    const datum = data[i];
    let rad2D = 0.5
    theta += 2*Math.PI/numPoints

    datum.x = rad2D * Math.cos(theta);
    datum.y = rad2D * Math.sin(theta);
    datum.z = 0;
  }
}

function torusLayout(data) {

  let numPoints = data.length/2;
  let loops = 50;
  let c = 0.3;
  let rad = 0.1

  // equidistant points on a spiral
  let theta = 0;
  let gamma = 0;
  for (let i = 0; i < numPoints; ++i) {
    const datum = data[i];
    
    theta += 2*Math.PI/numPoints
    gamma += 2*Math.PI/(numPoints/loops)
    // console.log(i, theta, gamma % 2*Math.PI)

    datum.x = (c + rad * Math.cos(gamma))*Math.cos(theta);
    datum.y = (c + rad * Math.cos(gamma))*Math.sin(theta);
    datum.z = rad*Math.sin(gamma);
  }

  // equidistant points on a spiral
  theta = 0;
  gamma = 0;
  for (let i = numPoints; i < numPoints*2; ++i) {
    const datum = data[i];
    
    theta += 2*Math.PI/numPoints
    gamma += 2*Math.PI/(numPoints/loops)
    // console.log(i, theta, gamma % 2*Math.PI)

    datum.x = (c + rad * Math.cos(gamma))*Math.cos(theta)  + c;
    datum.z = (c + rad * Math.cos(gamma))*Math.sin(theta);
    datum.y = rad*Math.sin(gamma);
  }


}


function customLayout(data, modelOutputs) {
  // console.log('customlauout', modelOutputs)
  
  const numPoints = data.length;


  for (let i = 0; i < numPoints; ++i) {
    const datum = data[i];
    if (modelOutputs === undefined) {
      // datum.x = 0;
      // datum.y = 0;
    } else {
      // console.log('xx', modelOutputs)
      // console.log(i)
      
      datum.x = modelOutputs[i*3];
      datum.y = modelOutputs[i*3+1];
      datum.z = modelOutputs[i*3+2];;
      // TODO - work out how to signal its divisible by 3
      // console.log(datum)
    }
    
    
  }
}


export const useLayout = ({ data, layout = 'grid', modelOutputs }) => {

  React.useEffect(() => {
    if (modelOutputs === undefined) { 
    switch (layout) {
      case 'spiral':
        spiralLayout(data);
        break;
      case 'torus':
        torusLayout(data);
        break;
      case 'grid':
      default: {
        gridLayout(data);
      }
    }

  } else {
    
    customLayout(data, modelOutputs)
  }

  }, [data, layout, modelOutputs]);
};

function useSourceTargetLayout({ data, layout, modelOutputs }) {
  
  // prep for new animation by storing source
  React.useEffect(() => {
    for (let i = 0; i < data.length; ++i) {
      data[i].sourceX = (data[i].x || 0).valueOf();
      data[i].sourceY = (data[i].y || 0).valueOf();
      data[i].sourceZ = (data[i].z || 0).valueOf();
    }
  }, [data, layout, modelOutputs]);

  // run layout
  // console.log('we', modelOutputs)

  // console.log('1', layout, data[0])

  useLayout({ data, layout, modelOutputs});

  // store target
  React.useEffect(() => {
    for (let i = 0; i < data.length; ++i) {
      data[i].targetX = data[i].x;
      data[i].targetY = data[i].y;
      data[i].targetZ = data[i].z;
    }
  }, [data, layout, modelOutputs]);

  // console.log('2', layout, data[0])
}

function interpolateSourceTarget(data, progress, layout) {
  // console.log(progress, layout)

  // console.log(layout, progress, data[0])
  for (let i = 0; i < data.length; ++i) {
    data[i].x = (1 - progress) * data[i].sourceX + progress * data[i].targetX;
    data[i].y = (1 - progress) * data[i].sourceY + progress * data[i].targetY;
    data[i].z = (1 - progress) * data[i].sourceZ + progress * data[i].targetZ;
  }
}

export function useAnimatedLayout({ data, layout, onFrame , modelOutputs}) {
  // compute layout remembering initial position as source and
  // end position as target
  
  useSourceTargetLayout({ data, layout, modelOutputs });
  
  // do the actual animation when layout changes
  const prevLayout = React.useRef(layout);
  // console.log(prevLayout.current, layout, layout !== prevLayout.current)
  const animProps = useSpring({
    animationProgress: 1,
    from: { animationProgress: 0 },
    reset: layout !== prevLayout.current,
    onFrame: ({ animationProgress }) => {
      // interpolate based on progress
      interpolateSourceTarget(data, animationProgress, layout);
      // callback to indicate data has updated
      onFrame({ animationProgress });
    },
  });
  prevLayout.current = layout;

  return animProps;
}
