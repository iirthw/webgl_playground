const VirtualTrackballImpl = {
    resetTimeMillis: 1500
}

class VirtualTrackball {
    #canvasHeight
    #canvasWidth
    #drawEffectFlag

    constructor() {
        this.#canvasWidth = NaN;
        this.#canvasHeight = NaN;
        this.prevMousePos = vec2.create(new Float32Array([NaN, NaN]));
        this.currMousePos = vec2.create(new Float32Array([NaN, NaN]));
        this.#drawEffectFlag = false;
        this.timestamp = NaN;
    } // ctor

    set canvasWidth(value) {
        if (value <= 0)
            throw 'Invalid canvasWidth';

        this.#canvasWidth = value;
    } // setter canvasWidth

    set canvasHeight(value) {
        if (value <= 0.0)
            throw 'Invalid canvasHeight';

        this.#canvasHeight = value;
    } // setter canvasHeight

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
        const n = vec3.cross(p0, p1);

        // 3. Compute the angle between p0 and p1
        const length0 = vec3.length(p0);
        const length1 = vec3.length(p1);
        if (length0 == 0 || legnth1 == 0)
            // FIXME: early exit
            return mat4.create();

        const theta = Math.asin(vec3.length(n) / (length0 * length1));

        // 4. Construct a quaternion corresponding to the rotation around
        //    the aforementioned axis
        const q = quat4.create([n[0], n[1], n[2], theta]);

        // 5. Convert the quaternion to the corresponding rotation matrix
        const R = quat4.toMat4(q);

        return R;
    }

    onMouseDown(pos) {
        this.prevMousePos = this.convertToNDC(pos);
        this.#drawEffectFlag = false;
    } // onMouseDown

    onMouseUp(pos) {
        this.currMousePos = this.convertToNDC(pos);
        this.#drawEffectFlag = true;
        this.timestamp = Date.now();

        this.computeRotation();
    } // onMouseUp
} // class Trackball