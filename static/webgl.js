"use strict";

const mm3 = (() => {
    const _add = (m, n) => {
        //
        // Given two 64bit ints (as an array of two 32bit ints) returns the two
        // added together as a 64bit int (as an array of two 32bit ints).
        //

        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
        var o = [0, 0, 0, 0];

        o[3] += m[3] + n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 0xffff;

        o[2] += m[2] + n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;

        o[1] += m[1] + n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;

        o[0] += m[0] + n[0];
        o[0] &= 0xffff;

        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]];
    }


    const _multiply = (m, n) => {
        //
        // Given two 64bit ints (as an array of two 32bit ints) returns the two
        // multiplied together as a 64bit int (as an array of two 32bit ints).
        //

        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
        var o = [0, 0, 0, 0];

        o[3] += m[3] * n[3];
        o[2] += o[3] >>> 16;
        o[3] &= 0xffff;

        o[2] += m[2] * n[3];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;

        o[2] += m[3] * n[2];
        o[1] += o[2] >>> 16;
        o[2] &= 0xffff;

        o[1] += m[1] * n[3];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;

        o[1] += m[2] * n[2];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;

        o[1] += m[3] * n[1];
        o[0] += o[1] >>> 16;
        o[1] &= 0xffff;

        o[0] += (m[0] * n[3]) + (m[1] * n[2]) + (m[2] * n[1]) + (m[3] * n[0]);
        o[0] &= 0xffff;

        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]];
    }


    const _rotateLeft = (m, n) => {
        //
        // Given a 64bit int (as an array of two 32bit ints) and an int
        // representing a number of bit positions, returns the 64bit int (as an
        // array of two 32bit ints) rotated left by that number of positions.
        //

        let n_mapped = n % 64;

        if (n_mapped === 32) {
            return [m[1], m[0]];
        }

        else if (n_mapped < 32) {
            return [(m[0] << n_mapped) | (m[1] >>> (32 - n_mapped)), (m[1] << n_mapped) | (m[0] >>> (32 - n_mapped))];
        } else {
            n_mapped -= 32;
            return [(m[1] << n_mapped) | (m[0] >>> (32 - n_mapped)), (m[0] << n_mapped) | (m[1] >>> (32 - n_mapped))];
        }
    }


    const _leftShift = (m, n) => {
        //
        // Given a 64bit int (as an array of two 32bit ints) and an int
        // representing a number of bit positions, returns the 64bit int (as an
        // array of two 32bit ints) shifted left by that number of positions.
        //

        const n_mapped = n % 64;

        if (n_mapped === 0) {
            return m;
        }

        else if (n_mapped < 32) {
            return [(m[0] << n_mapped) | (m[1] >>> (32 - n_mapped)), m[1] << n_mapped];
        }

        else {
            return [m[1] << (n_mapped - 32), 0];
        }
    }


    const _xor = (m, n) => {
        //
        // Given two 64bit ints (as an array of two 32bit ints) returns the two
        // xored together as a 64bit int (as an array of two 32bit ints).
        //

        return [m[0] ^ n[0], m[1] ^ n[1]];
    }


    const _finalize = (h) => {
        //
        // Given a block, returns murmurHash3's final x64 mix of that block.
        // (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
        // only place where we need to right shift 64bit ints.)
        //

        h = _xor(h, [0, h[0] >>> 1]);
        h = _multiply(h, [0xff51afd7, 0xed558ccd]);
        h = _xor(h, [0, h[0] >>> 1]);
        h = _multiply(h, [0xc4ceb9fe, 0x1a85ec53]);
        h = _xor(h, [0, h[0] >>> 1]);

        return h;
    }

    return (key, seed) => {
        //
        // Given a string and an optional seed as an int, returns a 128 bit
        // hash usinga the x64 flavor of MurmurHash3, as an unsigned hex.
        //

        key = key || '';
        seed = seed || 0;

        const key_bytes = Array(key.length);

        {
            for (let i = 0; i < key.length; ++i) {
                key_bytes[i] = key.charCodeAt(i) & 0xFF;
            }
        }

        var remainder = key_bytes.length % 16;
        var bytes = key_bytes.length - remainder;

        var h1 = [0, seed];
        var h2 = [0, seed];

        var k1 = [0, 0];
        var k2 = [0, 0];

        var c1 = [0x87c37b91, 0x114253d5];
        var c2 = [0x4cf5ad43, 0x2745937f];

        for (var i = 0; i < bytes; i = i + 16) {
            k1 = [((key_bytes[i + 4])) | ((key_bytes[i + 5]) << 8) | ((key_bytes[i + 6]) << 16) | ((key_bytes[i + 7]) << 24), (key_bytes[i]) | ((key_bytes[i + i]) << 8) | ((key_bytes[i + 2]) << 16) | ((key_bytes[i + 3]) << 24)];
            k2 = [((key_bytes[i + 12])) | ((key_bytes[i + 13]) << 8) | ((key_bytes[i + 14]) << 16) | ((key_bytes[i + 15]) << 24), ((key_bytes[i + 8])) | ((key_bytes[i + 9]) << 8) | ((key_bytes[i + 10]) << 16) | ((key_bytes[i + 11]) << 24)];

            k1 = _multiply(k1, c1);
            k1 = _rotateLeft(k1, 31);
            k1 = _multiply(k1, c2);
            h1 = _xor(h1, k1);

            h1 = _rotateLeft(h1, 27);
            h1 = _add(h1, h2);
            h1 = _add(_multiply(h1, [0, 5]), [0, 0x52dce729]);

            k2 = _multiply(k2, c2);
            k2 = _rotateLeft(k2, 33);
            k2 = _multiply(k2, c1);
            h2 = _xor(h2, k2);

            h2 = _rotateLeft(h2, 31);
            h2 = _add(h2, h1);
            h2 = _add(_multiply(h2, [0, 5]), [0, 0x38495ab5]);
        }

        k1 = [0, 0];
        k2 = [0, 0];

        switch(remainder) {
            case 15:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 14]], 48));

            case 14:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 13]], 40));

            case 13:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 12]], 32));

            case 12:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 11]], 24));

            case 11:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 10]], 16));

            case 10:
                k2 = _xor(k2, _leftShift([0, key_bytes[i + 9]], 8));

            case 9:
                k2 = _xor(k2, [0, key_bytes[i + 8]]);
                k2 = _multiply(k2, c2);
                k2 = _rotateLeft(k2, 33);
                k2 = _multiply(k2, c1);
                h2 = _xor(h2, k2);

            case 8:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 7]], 56));

            case 7:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 6]], 48));

            case 6:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 5]], 40));

            case 5:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 4]], 32));

            case 4:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 3]], 24));

            case 3:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 2]], 16));

            case 2:
                k1 = _xor(k1, _leftShift([0, key_bytes[i + 1]], 8));

            case 1:
                k1 = _xor(k1, [0, key_bytes[i]]);
                k1 = _multiply(k1, c1);
                k1 = _rotateLeft(k1, 31);
                k1 = _multiply(k1, c2);
                h1 = _xor(h1, k1);
        }

        h1 = _xor(h1, [0, key_bytes.length]);
        h2 = _xor(h2, [0, key_bytes.length]);

        h1 = _add(h1, h2);
        h2 = _add(h2, h1);

        h1 = _finalize(h1);
        h2 = _finalize(h2);

        h1 = _add(h1, h2);
        h2 = _add(h2, h1);

        return ("00000000" + (h1[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h1[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (h2[1] >>> 0).toString(16)).slice(-8);
    };
})();

class WebGLShort {
    constructor() {
        this._gl = null;
        this._contextName = '';

        this._hasWebGL = window['WebGLRenderingContext'];
        this._hasWebGL2 = window['WebGL2RenderingContext'];

        const webGLSupport = this._ensureWarmup();

        this._report = [
            window['navigator']['platform'],
            webGLSupport
        ];

        this._init();
    }

    _ensureWarmup() {
        if (!this._hasWebGL && !this._hasWebGL2) {
            // The browser does not support WebGL
            return -1;
        }

        this._initWebGL();

        if (Boolean(this._gl && this._contextName)) {
            return -2;
        }

        return 1;
    }

    _initWebGL() {
        var canvas = document.createElement('canvas');

        var gl;

        var possibleNames = ['webgl2', 'experimental-webgl2', 'webgl', 'experimental-webgl'].filter(function(name) {
            const nameContext = canvas.getContext(name, {
                stencil: true
            });

            if (nameContext) {
                gl = nameContext;
            }

            return gl;
        });

        this._gl = gl;
        this._contextName = possibleNames[0];
    }

    _getMaxAnisotropy() {
        var e = this._gl['getExtension']('EXT_texture_filter_anisotropic') || this._gl['getExtension']('WEBKIT_EXT_texture_filter_anisotropic') || this._gl['getExtension']('MOZ_EXT_texture_filter_anisotropic');

        if (e) {
            var max = this._gl['getParameter'](e.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            // See Canary bug: https://code.google.com/p/chromium/issues/detail?id=117450
            if (max === 0) {
                max = 2;
            }
            return max;
        }
        return -1;
    }

    _getPrecisionDescription(precision) {
        return [precision.rangeMin, precision.rangeMax, precision.precision];
    }

    _getBestFloatPrecision(shaderType) {
        var high = this._gl['getShaderPrecisionFormat'](shaderType, this._gl['HIGH_FLOAT']);
        var medium = this._gl['getShaderPrecisionFormat'](shaderType, this._gl['MEDIUM_FLOAT']);
        var low = this._gl['getShaderPrecisionFormat'](shaderType, this._gl['LOW_FLOAT']);

        var best = high;
        if (high.precision === 0) {
            best = medium;
        }

        return this._getPrecisionDescription(high).concat(this._getPrecisionDescription(best));
    }

    _getFloatIntPrecision(gl) {
        var high = this._gl['getShaderPrecisionFormat'](this._gl['FRAGMENT_SHADER'], this._gl['HIGH_FLOAT']);
        var s = (high.precision !== 0) ? 'highp/' : 'mediump/';

        high = this._gl['getShaderPrecisionFormat'](this._gl['FRAGMENT_SHADER'], this._gl['HIGH_INT']);
        s += (high.rangeMax !== 0) ? 'highp' : 'lowp';

        return s;
    }

    _isPowerOfTwo(n) {
        return (n !== 0) && ((n & (n - 1)) === 0);
    }

    _getAngle(gl) {
        var lineWidthRange = this._gl['getParameter'](this._gl['ALIASED_LINE_WIDTH_RANGE']);

        // Heuristic: ANGLE is only on Windows, not in IE, and not in Edge, and does not implement line width greater than one.
        var angle = ((navigator.platform === 'Win32') || (navigator.platform === 'Win64')) &&
            (this._gl['getParameter'](this._gl['RENDERER']) !== 'Internet Explorer') &&
            (this._gl['getParameter'](this._gl['RENDERER']) !== 'Microsoft Edge') &&
            (lineWidthRange === [1, 1]);

        if (angle) {
            // Heuristic: D3D11 backend does not appear to reserve uniforms like the D3D9 backend, e.g.,
            // D3D11 may have 1024 uniforms per stage, but D3D9 has 254 and 221.
            //
            // We could also test for WEBGL_draw_buffers, but many systems do not have it yet
            // due to driver bugs, etc.
            if (this._isPowerOfTwo(this._gl['getParameter'](this._gl['MAX_VERTEX_UNIFORM_VECTORS'])) && isPowerOfTwo(this._gl['getParameter'](this._gl['MAX_FRAGMENT_UNIFORM_VECTORS']))) {
                return 'D3D11';
            } else {
                return 'D3D9';
            }
        }

        return '';
    }

    _getMaxColorBuffers(gl) {
        var maxColorBuffers = 1;
        var ext = this._gl['getExtension']("WEBGL_draw_buffers");
        if (ext)
            maxColorBuffers = this._gl['getParameter'](ext.MAX_DRAW_BUFFERS_WEBGL);

        return maxColorBuffers;
    }

    _getUnmaskedInfo(gl) {
        var unMaskedInfo = {
            renderer: '',
            vendor: ''
        };

        var dbgRenderInfo = this._gl['getExtension']("WEBGL_debug_renderer_info");
        if (dbgRenderInfo) {
            unMaskedInfo.renderer = this._gl['getParameter'](dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
            unMaskedInfo.vendor = this._gl['getParameter'](dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
        }

        return unMaskedInfo;
    }

    _showNull(v) {
        return v ? v : -1;
    }

    _getWebGL2Status(gl, contextName) {
        var webgl2Names = [
            'copyBufferSubData',
            'getBufferSubData',
            'blitFramebuffer',
            'framebufferTextureLayer',
            'getInternalformatParameter',
            'invalidateFramebuffer',
            'invalidateSubFramebuffer',
            'readBuffer',
            'renderbufferStorageMultisample',
            'texStorage2D',
            'texStorage3D',
            'texImage3D',
            'texSubImage3D',
            'copyTexSubImage3D',
            'compressedTexImage3D',
            'compressedTexSubImage3D',
            'getFragDataLocation',
            'uniform1ui',
            'uniform2ui',
            'uniform3ui',
            'uniform4ui',
            'uniform1uiv',
            'uniform2uiv',
            'uniform3uiv',
            'uniform4uiv',
            'uniformMatrix2x3fv',
            'uniformMatrix3x2fv',
            'uniformMatrix2x4fv',
            'uniformMatrix4x2fv',
            'uniformMatrix3x4fv',
            'uniformMatrix4x3fv',
            'vertexAttribI4i',
            'vertexAttribI4iv',
            'vertexAttribI4ui',
            'vertexAttribI4uiv',
            'vertexAttribIPointer',
            'vertexAttribDivisor',
            'drawArraysInstanced',
            'drawElementsInstanced',
            'drawRangeElements',
            'drawBuffers',
            'clearBufferiv',
            'clearBufferuiv',
            'clearBufferfv',
            'clearBufferfi',
            'createQuery',
            'deleteQuery',
            'isQuery',
            'beginQuery',
            'endQuery',
            'getQuery',
            'getQueryParameter',
            'createSampler',
            'deleteSampler',
            'isSampler',
            'bindSampler',
            'samplerParameteri',
            'samplerParameterf',
            'getSamplerParameter',
            'fenceSync',
            'isSync',
            'deleteSync',
            'clientWaitSync',
            'waitSync',
            'getSyncParameter',
            'createTransformFeedback',
            'deleteTransformFeedback',
            'isTransformFeedback',
            'bindTransformFeedback',
            'beginTransformFeedback',
            'endTransformFeedback',
            'transformFeedbackVaryings',
            'getTransformFeedbackVarying',
            'pauseTransformFeedback',
            'resumeTransformFeedback',
            'bindBufferBase',
            'bindBufferRange',
            'getIndexedParameter',
            'getUniformIndices',
            'getActiveUniforms',
            'getUniformBlockIndex',
            'getActiveUniformBlockParameter',
            'getActiveUniformBlockName',
            'uniformBlockBinding',
            'createVertexArray',
            'deleteVertexArray',
            'isVertexArray',
            'bindVertexArray'
        ];

        const webgl2 = (this._contextName.indexOf('webgl2') !== -1);

        const length = webgl2Names.length;

        const functions = [];
        let totalImplemented = 0;

        if (webgl2) {
            for (let i = 0; i < length; ++i) {
                const name = webgl2Names[i];
                if (webgl2 && this._gl[name]) {
                    ++totalImplemented;

                    functions.push(name);
                }
            }
        }

        return [webgl2 ? totalImplemented : 0, length].concat(functions);
    }

    _init() {
        const webgl2Status = this._getWebGL2Status(this._gl, this._contextName);

        const features = [
            this._contextName,
            this._gl['getParameter'](this._gl['VERSION']),
            this._gl['getParameter'](this._gl['SHADING_LANGUAGE_VERSION']),
            this._gl['getParameter'](this._gl['VENDOR']),
            this._gl['getParameter'](this._gl['RENDERER']),
            this._getUnmaskedInfo(this._gl).vendor,
            this._getUnmaskedInfo(this._gl).renderer,
            this._gl['getContextAttributes']().antialias,
            this._getAngle(this._gl),
            this._getMaxColorBuffers(this._gl),
            this._gl['getParameter'](this._gl['RED_BITS']),
            this._gl['getParameter'](this._gl['GREEN_BITS']),
            this._gl['getParameter'](this._gl['BLUE_BITS']),
            this._gl['getParameter'](this._gl['ALPHA_BITS']),
            this._gl['getParameter'](this._gl['DEPTH_BITS']),
            this._gl['getParameter'](this._gl['STENCIL_BITS']),
            this._gl['getParameter'](this._gl['MAX_RENDERBUFFER_SIZE']),
            this._gl['getParameter'](this._gl['MAX_COMBINED_TEXTURE_IMAGE_UNITS']),
            this._gl['getParameter'](this._gl['MAX_CUBE_MAP_TEXTURE_SIZE']),
            this._gl['getParameter'](this._gl['MAX_FRAGMENT_UNIFORM_VECTORS']),
            this._gl['getParameter'](this._gl['MAX_TEXTURE_IMAGE_UNITS']),
            this._gl['getParameter'](this._gl['MAX_TEXTURE_SIZE']),
            this._gl['getParameter'](this._gl['MAX_VARYING_VECTORS']),
            this._gl['getParameter'](this._gl['MAX_VERTEX_ATTRIBS']),
            this._gl['getParameter'](this._gl['MAX_VERTEX_TEXTURE_IMAGE_UNITS']),
            this._gl['getParameter'](this._gl['MAX_VERTEX_UNIFORM_VECTORS']),
            ...[].slice.call(this._gl['getParameter'](this._gl['ALIASED_LINE_WIDTH_RANGE'])),
            ...[].slice.call(this._gl['getParameter'](this._gl['ALIASED_POINT_SIZE_RANGE'])),
            ...[].slice.call(this._gl['getParameter'](this._gl['MAX_VIEWPORT_DIMS'])),
            this._getMaxAnisotropy(),
            ...this._getBestFloatPrecision(this._gl['VERTEX_SHADER']),
            ...this._getBestFloatPrecision(this._gl['FRAGMENT_SHADER']),
            this._getFloatIntPrecision(this._gl),

            ...this._gl['getSupportedExtensions'](),

            ...webgl2Status,
        ];

        if (this._hasWebGL2) {
            [].push.apply(features, [
                this._showNull(this._gl['getParameter'](this._gl['MAX_VERTEX_UNIFORM_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_VERTEX_UNIFORM_BLOCKS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_VERTEX_OUTPUT_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_VARYING_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_FRAGMENT_UNIFORM_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_FRAGMENT_UNIFORM_BLOCKS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_FRAGMENT_INPUT_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MIN_PROGRAM_TEXEL_OFFSET'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_PROGRAM_TEXEL_OFFSET'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_DRAW_BUFFERS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_COLOR_ATTACHMENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_SAMPLES'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_3D_TEXTURE_SIZE'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_ARRAY_TEXTURE_LAYERS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_TEXTURE_LOD_BIAS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_UNIFORM_BUFFER_BINDINGS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_UNIFORM_BLOCK_SIZE'])),
                this._showNull(this._gl['getParameter'](this._gl['UNIFORM_BUFFER_OFFSET_ALIGNMENT'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_COMBINED_UNIFORM_BLOCKS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_ELEMENT_INDEX'])),
                this._showNull(this._gl['getParameter'](this._gl['MAX_SERVER_WAIT_TIMEOUT']))
            ]);
        }

        features.forEach(entry => {
            this._report.push(entry);
        });
    }

    id () {
        return mm3(this._report.join(''), 0xcafebabe);
    }
}

//(new WebGLShort()).id()
