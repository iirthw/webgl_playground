// look at:
// https://github.com/mdn/webgl-examples/blob/gh-pages/tutorial/sample6/webgl-demo.js

window.onload = function init()
{
    const canvas = document.getElementById("gl-canvas");
    const gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) 
    {
        alert("WebGL isn't available");
    }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Load shaders and initialize attribute buffers
    const shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
        },
        uniformLocations: {
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler')
        }
    };

    const buffers = initBuffers(gl, programInfo);
    // FIXME: leave only the url which is in use
    const texUrl = 'https://www.babylonjs-playground.com/textures/bloc.jpg';
    const texUrl2 = 'https://www.babylonjs-playground.com/textures/floor_bump.PNG';
    const texture = loadTexture(gl, texUrl, drawScene, programInfo, buffers);

    drawScene(gl, programInfo, buffers, texture);
};

function initBuffers(gl, programInfo)
{
    const quad = new ProceduralQuad();

    // Load the vertex position data into the GPU
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 
                  quad.vertexCoordinates,
                  gl.STATIC_DRAW);

    // Init texture coordinate buffer
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, 
                  quad.textureCoordinates,
                  gl.STATIC_DRAW);

    // Set up an element array buffer to hold indices into
    // vertex array that form triangles
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // send the element array to the GPU
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
                  quad.faces, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer
    }
}

function drawScene(gl, programInfo, buffers, texture)
{
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

    gl.useProgram(programInfo.program);

    // Bind element array buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Specify texture to WebGL
    // Use texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Associate shader sampler to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    // Execute the actual draw
    {        
        const vertexCount = 6;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
}