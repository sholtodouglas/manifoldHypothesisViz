import * as React from 'react';
import ThreePointVis from './ThreePointVis/ThreePointVis';
import './styles.css';
import * as tf from "@tensorflow/tfjs";
import { TextField } from '@material-ui/core';

const TOTAL_POINTS = 2000;
const data = new Array(TOTAL_POINTS).fill(0).map((d, id) => ({ id }));
const labels = new Array(TOTAL_POINTS/2).fill(0).concat( new Array(TOTAL_POINTS/2).fill(1))
const batchSize = 1000;

var optimizer = tf.train.adam(0.01 /* learningRate */);

function copyData(data) {
  const dataCopy = new Array(TOTAL_POINTS).fill(0).map((d, id) => ({ id }));
  for (let i = 0; i < data.length; ++i) {
    dataCopy[i] = Object.assign({}, data[i]);
  }
  return dataCopy;
}

const dataCopy = copyData(data)
var dimensions = [3,3,3,2];
var variables = [];
var selectedIndex = dimensions.length-1;
var largeLayerIndices = [0,3];

function setVariables(inputs=[]) {
  // The weights and biases for the two dense layers.
  variables = [];

  for (let i = 0; i < inputs.length-1; i++) {
    // weight
    variables.push(tf.variable(tf.randomNormal([inputs[i], inputs[i+1]])))
    console.log(inputs[i])
    // bias
    variables.push(tf.variable(tf.randomNormal([inputs[i+1]])))
    
    
  }

  optimizer = tf.train.adam(0.01 /* learningRate */);
}

function setDisplayedVariable(idx) {
  selectedIndex = idx;
}


function model(x, index=-1) {

  if (index < 0 ) {
    index = variables.length
  } else {
    index = index*2
  }

  for (let i = 0; i <index; i++) {
    // console.log(variables[i])
    x = x.matMul(variables[i])
    i++;
    x = x.add(variables[i])
    x = x.tanh()
    // console.log('x', x)
  }

  return x
  
  // return x.matMul(w1).add(b1).tanh().matMul(w2).add(b2).tanh().matMul(w3).add(b3).tanh();
}

async function getData(b=16) {

  if (b == 16) {
    b = batchSize
  }

  const xs = data.map(data => [data.x, data.y, data.z])
  const x = tf.tensor2d(xs, [xs.length, 3]);
  const y = tf.oneHot(labels,2)

  // // get an array of random indices
  const indices = tf.randomUniform([b], 0, TOTAL_POINTS, 'int32')

  const x_batch  = x.gather(indices)
  const y_batch = y.gather(indices)

  return [x_batch, y_batch]

}


async function trainModel(){




  const [x_batch, y_batch] = await getData();
  console.log(x_batch)

  // try {
  optimizer.minimize(() => {
        const predYs = model(x_batch);
        const loss = tf.losses.softmaxCrossEntropy(y_batch, predYs);
        loss.data().then(l => console.log('Loss', l));
        return loss;
      });
    // } catch (error) {
    //   console.log('vars', variables)
    //   console.error(error);
    //   // expected output: ReferenceError: nonExistentFunction is not defined
    //   // Note - error messages will vary depending on browser
    // }
    
}



export default function App() {
  const [layout, setLayout] = React.useState('torus');
  const [layout2, setLayout2] = React.useState('custom');
  const [selectedPoint, setSelectedPoint] = React.useState(null);
  const [time, setTime] = React.useState(Date.now());
  // const [model, setModel] = React.useState(createModel());
  const [modelOutputs, setOutputs] = React.useState(undefined);

  const [inputLayers, setInputLayers] = React.useState('3,3,3,2');
  const [loss, setLoss] = React.useState(0);
  
  // use the text field to update dimensions
  const handleSubmit = (evt) => {
      evt.preventDefault();
      dimensions = inputLayers.split(',').map(Number);
      console.log(dimensions)
      setVariables(dimensions)

  }

  const visRef = React.useRef();
  const handleResetCamera = () => {
    visRef.current.resetCamera();
  };

  const visRef2 = React.useRef();
  const handleResetCamera2 = () => {
    visRef2.current.resetCamera();
  };

  
  const setLabel = (selectedPoint) => {
    console.log("Selected point", selectedPoint)
    const idx = selectedPoint['id']
    labels[idx] = Math.abs(1-labels[idx])
    setSelectedPoint(selectedPoint)

    let test_input = tf.tensor2d([[selectedPoint.x, selectedPoint.y, selectedPoint.z]], [1,3])
    // console.log(test_input.dataSync())
    console.log('Pred', model(test_input).softmax().dataSync())


  }

  function get_inputs() {

    const x = data.map(data => [data.x, data.y, data.z])
    
    return tf.tensor2d(x, [x.length, 3]);
  }


  // async function UpdateModels() {

  //   let currentTime = Date.now()
  //   setTime(Date.now())
  //   const inputTensor = get_inputs()
  //   // const labelTensor = tf.tensor2d(labels, [labels.length, 1]);
  //   setOutputs(model(get_inputs()).dataSync())

  //   // Train the model
  //   await trainModel();
  //   console.log('Done Training');
  //   // console.log('prediction', model.predict(tf.slice(inputTensor,0,16)).dataSync())
  //   // tick();
  //   setLayout2("custom"+time)

  // }

  async function tick() {

    try {
      trainModel();
      const [x_batch, y_batch] = await getData(32);
      const predYs = model(x_batch);
      setLoss( await tf.losses.softmaxCrossEntropy(y_batch, predYs).data());


      // setLoss(loss.dataSync())
      // let currentTime = Date.now()
      // setTime(Date.now())

      var display = model(get_inputs(), selectedIndex);
      // console.log(selectedIndex, dimensions.length)
      if (selectedIndex == dimensions.length-1) {
        // console.log('islast')
        display = display.softmax();
      }
      // check if its 2D and if so add a dimension of zeros for z
      if (display.shape[1] == 2) { 
        display = tf.concat([display, tf.zeros([display.shape[0], 1])], 1)
      } else if (display.shape[1] > 3) {
        display = tf.slice(display, [0,largeLayerIndices[0]], [TOTAL_POINTS, largeLayerIndices[1]]);
      }

      // next only step it a little bit towards the goal
      const currentPos = tf.tensor2d(dataCopy.map(data => [data.x, data.y, data.z]), [TOTAL_POINTS, 3]);
      const nextPos = tf.add(currentPos.mul(0.7), display.mul(0.3));

      // console.log(currentPos, display, nextPos)

      setOutputs(nextPos.dataSync())
      // console.log('prediction', tf.slice(get_inputs(),0,16).dataSync())
      let newlayout = "custom"+Date.now()
      setLayout2(newlayout)
      // console.log('nl', newlayout)
      // console.log('time', time, )
    // console.log(layout2)
    } catch (error) {
      console.error(error);
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
    
  }

  React.useEffect(() => {
    // 
    // TODO have something down below trigger the beginnging of training
    setTimeout(() => setVariables(dimensions), 50);
    
    const interval = setInterval(() => tick(), 100);
    return () => {
      clearInterval(interval);
    };
  }, []);


  

  return (
    <div>
    <div className= "Header"> 
    <h1> Visualising neural net training through manifold transformations
    </h1>  

    On the left is a binary dataset - ranging in complexity from a 2D grid to two intersecting tori. On the right is the neural net's attempt to separate the classes. 
    The best introduction to the 'manifold theory' of neural networks is <a href="https://colah.github.io/posts/2014-03-NN-Manifolds-Topology/" rel="noreferrer">
        Chris Olah's post on neural nets, manifolds and topology
      </a>, and still the best way to understand the intuition is <a href="https://cs.stanford.edu/people/karpathy/convnetjs//demo/classify2d.html" rel="noreferrer">
          Karpathy's 2D ConvNetJS demo
      </a>
      <br/>

      By visualising it in three dimensions it lets us explore some of the more complex examples (such as the tori), and visualise how a three dimensional layer is necessary to separate some two dimensional shapes (such as the spiral).

      <br/>
      <br/>

      In order to successfully separate the tori examples - you'll need to change the model layers to include at least one four dimensional layer - can you think about why?

      <br/>
      <br/>

      Click nodes to change their class. Click the buttons to visualise specific layers, or submit the form to change the layers of the neural net (the input layer must be three dimensional, and the output layer two dimensional) Where a layer has more than 3 neurons, the first 3 are visualised. 
      Tanh activations are used to bound the outputs of each layer and make it easier to visualise. 

    </div>
    <div className="App">
    
    <div className="AppLHS">
      <div className="vis-container">
        <ThreePointVis
          ref={visRef}
          data={data}
          labels={labels}
          layout={layout}
          selectedPoint={selectedPoint}
          onSelectPoint={setLabel}
        />
      </div>
      <button className="reset-button" onClick={handleResetCamera}>
        Reset Camera
      </button>
      <div className="controls">
        <strong>Layouts</strong>{' '}
        <button
          onClick={() => setLayout('grid')}
          className={layout === 'grid' ? 'active' : undefined}
        >
          Grid
        </button>
        <button
          onClick={() => setLayout('spiral')}
          className={layout === 'spiral' ? 'active' : undefined}
        >
          Spiral
        </button>
        <button
          onClick={() => setLayout('torus')}
          className={layout === 'torus' ? 'active' : undefined}
        >
          Torus
        </button>

        {selectedPoint && (
          <div className="selected-point">
            You selected <strong>{selectedPoint.id}</strong>
          </div>
        )}
      </div>
    </div>
    {/* <div className="Divider">


    </div> */}
    <div className="AppRHS">
    <div className="vis-container">
        <ThreePointVis
          ref={visRef2}
          data={dataCopy}
          labels={labels}
          layout={layout2}
          selectedPoint={selectedPoint}
          onSelectPoint={setLabel}
          modelOutputs={modelOutputs}
        />
      </div>
      <button className="reset-button" onClick={handleResetCamera2}>
        Reset Camera
      </button>
      <div className="controls">
        <strong>Select Layer</strong>{' '}
        {/* <button
          className="reset-button" 
          onClick={() => setLayout('spiral')}
          className={layout === 'spiral' ? 'active' : undefined}
        >
          Spiral
        </button> */}

        <form onSubmit={handleSubmit}>
          <label>
            Model layers:
            <input
              type="text"
              value={inputLayers}
              onChange={e => setInputLayers(e.target.value)}
            />
          </label>
          <input type="submit" value="Update layers" />
        </form>

        <div>
      {dimensions.map((dim, idx) => (
        <button
                className="reset-button"
                onClick={() => setDisplayedVariable(idx)} //TODO CHANGE THIS SET
                className={selectedIndex === idx ? 'active' : undefined}
              >
                {dim}
        </button>

      ))}
      <div>
      Loss: {loss}
      </div>
      {/* {selectedIndex} */}
    </div>
        {selectedPoint && (
          <div className="selected-point">
            You selected <strong>{selectedPoint.id}</strong>
          </div>
        )}
      </div>

    </div>
    </div>
    </div>
  );
}
