// look at:
// https://github.com/mdn/webgl-examples/blob/gh-pages/tutorial/sample6/webgl-demo.js

// FIXME: resolve remaining FIXMEs ;-)

// =============================================================================
//
// WebGLController
//
// =============================================================================
class WebGLController {
    #scene
    #virtualTrackball

    // noop ctor
    constructor() {
        this.#scene = null;
        this.#virtualTrackball = null;
    } // ctor

    setupWebGL() {
        const canvas = document.getElementById("gl-canvas");
        const gl = WebGLUtils.setupWebGL(canvas);
        if (!gl) 
        {
            alert("WebGL isn't available");
        }
        return gl;
    } // setupWebGL

    setupOverlay(gl) {
        const shaderProgram = initShaders(gl, "vertex-shader-overlay",
                                          "fragment-shader-overlay");
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, "aPosition"),
                },
            uniformLocations: {
                drawEffectFlag: gl.getUniformLocation(shaderProgram, "uDrawEffectFlag"),
                prevMousePos: gl.getUniformLocation(shaderProgram, "uPrevMousePos"),
                currMousePos: gl.getUniformLocation(shaderProgram, "uCurrMousePos")
            }
        };

        const buffers = this.initOverlayBuffers(gl, shaderProgram);

        return { "buffers" : buffers, "programInfo" : programInfo }
    } // setupOverlay

    loadCube(cubeCenter, cubeSize) {
        // FIXME: temporarily fall back to hardCodedCube version
        // let cube = new ProceduralCube(cubeCenter, cubeSize);
        let cube = ProceduralCube.hardCodedCube(cubeCenter, cubeSize);
        cube.center = vec3.create(new Float32Array(cubeCenter));
        cube.size = cubeSize;
        return cube;
    } // loadCube

    setupCube(gl, render, cubeCenter, cubeSize) {
        // Load shaders and initialize attribute buffers
        const shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
            },
            uniformLocations: {
                uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
                modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')
            }
        };

        const cubeObject = this.loadCube(cubeCenter, cubeSize);
        const buffers = this.initCubeBuffers(gl, shaderProgram, cubeObject);

        const textureUrl = 'https://www.babylonjs-playground.com/textures/bloc.jpg';

        const texture = loadTexture(gl, textureUrl, render,
                                    shaderProgram, buffers);

        return { 
            "cubeObject" : cubeObject,
            "buffers" : buffers,
            "programInfo" : programInfo,
            "texture" : texture
            };
    } // setupCube

    update(deltaTime) {
        this.model.cubeRotation += deltaTime;
    } // update

    setupScene(cube, eye, canvas) {
        // Create a scene with a camera
        {
            const target = cube.center;
            const pivot = cube.center;
            const up = vec3.create(new Float32Array([0.0, 1.0, 0.0]));
            this.#scene = new Scene(
                new Camera(eye, target, pivot, up)
                );
        }
        // Create virtual trackball
        {
            this.#virtualTrackball = new VirtualTrackball(
                this.#scene,
                canvas.clientWidth,
                canvas.clientHeight);
        }
    } // setupScene

    initOverlayBuffers(gl, progarmInfo) {
        const overlay = new FullScreenQuad();

        const positionBuffer = gl.createBuffer(); 
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, overlay.vertexCoordinates, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, overlay.faces, gl.STATIC_DRAW);

        return {
            position : positionBuffer,
            indices : indexBuffer,
            nbIndices : overlay.faces.length
        }
    } // initOverlayBuffers

    initCubeBuffers(gl, programInfo, cubeObject) {
        // Load the vertex position data into the GPU
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, 
                      cubeObject.vertexCoordinates,
                      gl.STATIC_DRAW);

        // Init texture coordinate buffer
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, 
                      cubeObject.textureCoordinates,
                      gl.STATIC_DRAW);

        // Set up an element array buffer to hold indices into
        // vertex array that form triangles
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // send the element array to the GPU
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
                      cubeObject.faces,
                      gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
            nbIndices: cubeObject.faces.length
        }
    } // initCubeBuffers

    drawScene(gl, renderData, deltaTime) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Clear color and depth buffers
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Draw rotating cube
        this.drawCube(gl, renderData, deltaTime);

        // Draw the overlay quad
        this.drawOverlay(gl, renderData, deltaTime);

        // Display the debug info
        this.displayDebugInfo();

        // Update view frustrum
        this.update(deltaTime);
    } // drawScene

    drawCube(gl, renderData, deltaTime) {
        const programInfo = renderData.shaders.cube;
        const buffers = renderData.buffers.cube;
        const texture = renderData.textures.cube;

        let modelMatrix = mat4.identity();
        const viewMatrix = this.#scene.camera.viewMatrix;
        const projectionMatrix = this.#scene.camera.projectionMatrix;

        {
            modelMatrix = mat4.translate(modelMatrix, 
                           [-0.0, 0.0, -7.0]);
            
            const rot_z_radian = this.model.cubeRotation;
            mat4.rotate(modelMatrix,
                        rot_z_radian,
                        [0, 0, 1],
                        modelMatrix);
            
            const rot_x_radian = .7 * this.model.cubeRotation;
            mat4.rotate(modelMatrix,
                        rot_x_radian,
                        [1, 0, 0],
                        modelMatrix);
        }

        gl.useProgram(programInfo.program);

        // Tell GPU how to pull out vertex coordinates
        // from the data associated to vertex attributes
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 
                                   numComponents, type, normalize,
                                   stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        }

        // Tell GPU how to pull out texture coordinates
        // from the data in the buffer
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);

            const numComponents = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 
                                   numComponents, type, normalize,
                                   stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
        }

        // Bind element array buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        // Specify texture to WebGL
        // Use texture unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Associate shader sampler to texture unit 0
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // FIXME: Precompute the MVP matrix on the application side on the CPU
        // Configure MVP uniforms
        // Model
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        // View
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        // Projection
        gl.uniformMatrix4fv(
                programInfo.uniformLocations.projectionMatrix,
                false,
                projectionMatrix);

        // Execute the actual draw
        {        
            const nbIndices = buffers.nbIndices;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, nbIndices, type, offset);
        }
    } // drawCube

    drawOverlay(gl, renderData, deltaTime) {
        const programInfo = renderData.shaders.overlay;
        const buffers = renderData.buffers.overlay;
        const texture = renderData.textures.overlay;

         gl.useProgram(programInfo.program);

        // Tell GPU how to pull out vertex coordinates
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 
                                   numComponents, type, normalize,
                                   stride, offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        }

        // Enable color blending for the transparency effect
        gl.enable(gl.BLEND);
        // Specify blending percentages
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Bind element array buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        {
            const uniformLoc = programInfo.uniformLocations;
            const drawEffectFlag = this.#virtualTrackball.drawEffectFlag;
            gl.uniform1i(uniformLoc.drawEffectFlag, drawEffectFlag);
            if (drawEffectFlag) {
                gl.uniform2fv(uniformLoc.prevMousePos, 
                    this.#virtualTrackball.prevMousePos);
                gl.uniform2fv(uniformLoc.currMousePos,
                    this.#virtualTrackball.currMousePos);
            }

        }

        // Execute the actual draw
        {        
            const nbIndices = buffers.nbIndices;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, nbIndices, type, offset);
        }
    } // drawOverlay

// =============================================================================
//
// DisplayDebugInfo
//
// =============================================================================

    displayDebugInfoCamPos(debugInfoDiv, debugSubDiv) {
        debugInfoDiv.innerHTML += "<b>Camera: position</b><br/>";

        const position = this.#scene.camera.position;
        let i = 0;
        position.forEach(el => {
            debugInfoDiv.innerHTML += `${el}`;
            if (i++ < 2)
                debugInfoDiv.innerHTML += ', ';
        });
    } // displayDebugInfoCamPos

    displayDebugInfoCamTarget(debugInfoDiv, debugSubDiv) {
        debugInfoDiv.innerHTML += "<b>Camera: target</b><br/>";

        const target = this.#scene.camera.target;
        let i = 0;
        target.forEach(el => {
            debugInfoDiv.innerHTML += `${el}`;
            if (i++ < 2)
                debugInfoDiv.innerHTML += ', ';
        });
    } // displayDebugInfoCamTarget

    displayDebugInfoCamViewMat(debugInfoDiv, debugSubDiv) {
        debugInfoDiv.innerHTML += "<b>Camera: viewMatrix</b><br/>";

        const camera = this.#scene.camera;
        const viewMatrix = camera.viewMatrix;
        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 4; ++j) {
                const el = viewMatrix[j * 4 + i];
                debugInfoDiv.innerHTML +=`${el} `;
                if (j == 3)
                    debugInfoDiv.innerHTML += '<br/>';    
            }
        }
    } // displayDebugInfoCamViewMat

    displayDebugInfoDispatch(debugInfoDiv, debugSubDiv) {
        debugInfoDiv.innerHTML += '<div id="' + debugSubDiv + '">';

        switch (debugSubDiv) {            
            case 'Camera.position':
                debugInfoDiv.innerHTML += "<br/>";
                this.displayDebugInfoCamPos(debugInfoDiv, debugSubDiv);
                debugInfoDiv.innerHTML += "<br/>";
                break;
            case 'Camera.target':
                debugInfoDiv.innerHTML += "<br/>";
                this.displayDebugInfoCamTarget(debugInfoDiv, debugSubDiv);
                debugInfoDiv.innerHTML += "<br/>";
                break;
            case 'Camera.viewMatrix':
                debugInfoDiv.innerHTML += "<br/>";
                this.displayDebugInfoCamViewMat(debugInfoDiv, debugSubDiv)
                debugInfoDiv.innerHTML += "<br/>";
                break;
        }

        debugInfoDiv.innerHTML += '</div>';
    } // displayDebugInfoDispatch

    displayDebugInfo() {
        const debugInfoDiv = document.getElementById('debugInfoDiv');
        debugInfoDiv.innerHTML = "";
        this.displayDebugInfoDispatch(debugInfoDiv, 'Camera.position');
        this.displayDebugInfoDispatch(debugInfoDiv, 'Camera.target');
        this.displayDebugInfoDispatch(debugInfoDiv, 'Camera.viewMatrix');
    } // displayDebugInfo

// =============================================================================
//
// Listeners
//
// =============================================================================

    registerListeners(gl) {        
        gl.canvas.addEventListener("mousedown", event => {            
            this.#virtualTrackball.onMouseDown(
                    vec2.create(new Float32Array([event.pageX, event.pageY]))
                );
        });

        gl.canvas.addEventListener("mouseup", e => {
            this.#virtualTrackball.onMouseUp(
                    vec2.create(new Float32Array([event.pageX, event.pageY]))
                );            
        });
    } // registerListeners

// =============================================================================
//
// init
//
// =============================================================================

    init() {
        const gl = this.setupWebGL();

        this.registerListeners(gl);

        this.model = { cubeRotation : 0.0 };
        // "Forward declare" render function
        let then = 0;
        // /!\ A disgraceful alias for this, as a workaround to pass this to the 
        // render function which takes only one argument (current time millis)
        // from requestAnimationFrame. Check if it does not create some retain 
        // cycle (as it has a memory leak code smell)
        // Check if WeakRef could be used instead? 
        // (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
        const self = this;

        const renderFn = function render(now) {
            // convert millis to seconds
            now *= 0.001;
            // FIXME: deltaTime = now - then;
            const deltaTime = 0.005;
            then = now;

            self.drawScene(gl, renderData, deltaTime);

            requestAnimationFrame(renderFn);
        }

        // Compile shaders and set up buffers
        // For the fullscreen overlay and cube object
        const overlayData = this.setupOverlay(gl);
        const cubeCenter = [0.0, 0.0, 0.0];
        const cubeSize = 1.0;
        const cubeData = this.setupCube(gl, renderFn, cubeCenter, cubeSize);
        
        const eye = vec3.create(new Float32Array([0.0, 0.0, 5.0]));
        this.setupScene(cubeData.cubeObject, eye, gl.canvas);

        const buffers = { "overlay" : overlayData.buffers,
                          "cube": cubeData.buffers };
        const shaders = { "overlay" : overlayData.programInfo,
                          "cube" : cubeData.programInfo };
        const textures = { "overlay" : overlayData.texture,
                           "cube" : cubeData.texture }
        let renderData = {
            "buffers": buffers,
            "shaders": shaders,
            "textures": textures
        }

        this.displayDebugInfo();
        
        requestAnimationFrame(renderFn);
    } // init
    
} // class WebGLController

// =============================================================================
//
// Init and run WebGL program
//
// =============================================================================

var controller = new WebGLController();
window.onload = controller.init();