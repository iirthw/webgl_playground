// =============================================================================
//
// VirtualTrackball
//
// =============================================================================

// FIXME: reminder to resolve all fixmes

const VirtualTrackballImpl = {
    resetTimeMillis: 1500
}

class VirtualTrackball {
    #canvasWidth
    #canvasHeight
    #drawEffectFlag

    constructor(scene, canvasWidth, canvasHeight) {
        this.scene = scene;        

        this.#canvasWidth = canvasWidth;
        this.#canvasHeight = canvasHeight;

        this.prevMousePos = vec2.create(new Float32Array([NaN, NaN]));
        this.currMousePos = vec2.create(new Float32Array([NaN, NaN]));

        this.#drawEffectFlag = false;
        this.timestamp = NaN;
    } // ctor

    get drawEffectFlag() {
        if (isNaN(this.timestamp))
            return false;

        const currTimeMillis = Date.now();
        const elapsedTime = currTimeMillis - this.timestamp;
        if (elapsedTime > VirtualTrackballImpl.resetTimeMillis) {
            this.#drawEffectFlag = false;
            this.timestamp = NaN;
        }
        
        return this.#drawEffectFlag;
    } // drawEffectFlag

    convertToNDC(vector) {
        // Translate to NDC origin
        const halfWidth = this.#canvasWidth / 2;
        const halfHeight = this.#canvasHeight / 2;

        // 1. Convert vector to fit range [0, 2] x [0, 2]
        vector[0] /= halfWidth;
        vector[1] /= halfHeight;
        // 2. Translate origin from top-left to NDC center
        //    and flip the y-axis
        // such that x' = x - 1; and y' = 1 - y; 
        vector[0] = vector[0] - 1;
        vector[1] = 1 - vector[1];      

        return vector;
    } // convertToNDC

    computeRotation() {
        // 1. Project previous and current positions
        //  onto the virtual trackball sphere
        const x0 = this.prevMousePos[0];
        const y0 = this.prevMousePos[1];
        const z0 = Math.sqrt(1.0 - x0 * x0 - y0 * y0);
        const p0 = vec3.create([x0, y0, z0]);

        const x1 = this.currMousePos[0];
        const y1 = this.currMousePos[1];
        const z1 = Math.sqrt(1.0 - x1 * x1 - y1 * y1);
        const p1 = vec3.create([x1, y1, z1]);

        // 2. Find the axis of rotation (n = cross(p0, p1))
        //    after the normalization of p0 and p1
        vec3.normalize(p0);
        vec3.normalize(p1);
        const n = vec3.cross(p0, p1);

        // 3. Compute the angle between p0 and p1
        const length0 = vec3.length(p0);
        const length1 = vec3.length(p1);
        if (length0 == 0 || length1 == 0)
            // FIXME: early exit
            return mat4.create();

        // FIXME: verify the correctness of computation
        // of the angle between p0 and p1
        const lengthOfN = vec3.length(n);
        // Since both p0 and p1 are unit vectors,
        // sine of angle betwenn them equals to
        // the lenght of vector n 
        const theta = Math.asin(lengthOfN);
        // const theta = Math.asin(lengthOfN / (length0 * length1));

        // 4. Construct a quaternion corresponding to the rotation around
        //    the aforementioned axis
        const q = quat4.create([n[0], n[1], n[2], theta]);

        // 5. Convert the quaternion to the corresponding rotation matrix
        const R = quat4.toMat4(q);

        return R;
    }

    rotate(rotation) {
        // Rotate camera's position
        let position = this.scene.camera.position;
        let newPosition = vec4.create();
        newPosition[0] = position[0];
        newPosition[1] = position[1];
        newPosition[2] = position[2];
        newPosition[3] = 1.0;

        const len0 = vec3.length(newPosition);
        newPosition = mat4.multiplyVec4(rotation, newPosition, newPosition);
        const len1 = vec3.length(newPosition);

        this.scene.camera.lookAtNaive(newPosition,
                                      this.scene.camera.target,
                                      vec3.create(new Float32Array([0, 1, 0])));
    } // rotate

    onMouseDown(pos) {
        this.prevMousePos = this.convertToNDC(pos);
        this.#drawEffectFlag = false;
    } // onMouseDown

    onMouseUp(pos) {
        this.currMousePos = this.convertToNDC(pos);
        this.#drawEffectFlag = true;
        this.timestamp = Date.now();

        const rotation = this.computeRotation();        
        this.rotate(rotation);
    } // onMouseUp
} // class Trackball