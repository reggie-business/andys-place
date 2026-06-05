'use client';

import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_opacity;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.55;

  for (int i = 0; i < 5; i++) {
    total += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }

  return total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect * 1.85;
  float t = u_time * 0.14;

  vec2 warpBase = p + vec2(
    sin(p.y * 2.1 + t * 0.7) * 0.16 + noise(p * 1.5 + vec2(t * 0.2, -t * 0.18)) * 0.08,
    cos(p.x * 2.0 - t * 0.9) * 0.16 + noise(p * 1.6 - vec2(-t * 0.14, t * 0.24)) * 0.08
  );

  float n = fbm(warpBase * 1.05 + vec2(t * 0.12, t * 0.1));
  vec2 warpCoords = warpBase + vec2(n * 0.28, n * 0.28);
  float value = fbm(warpCoords * 1.55 + vec2(t * 0.09, -t * 0.11));
  value = smoothstep(0.2, 0.72, value);

  float gray = mix(0.14, 0.44, value) * 0.78;
  gray = clamp(gray, 0.0, 1.0);

  gl_FragColor = vec4(vec3(gray), u_opacity);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  return { program, vertexShader, fragmentShader };
}

export default function FunhouseBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl =
      canvas.getContext('webgl2', { alpha: true }) ||
      canvas.getContext('webgl', { alpha: true });

    if (!gl) return undefined;

    const programInfo = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!programInfo) return undefined;

    const { program, vertexShader, fragmentShader } = programInfo;
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const opacityLocation = gl.getUniformLocation(program, 'u_opacity');

    if (
      positionLocation === -1 ||
      timeLocation === null ||
      resolutionLocation === null ||
      opacityLocation === null
    ) {
      return undefined;
    }

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) return undefined;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let shouldAnimate = !prefersReducedMotion.matches;
    let animationFrameId = 0;
    let lastTime = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        gl.viewport(0, 0, width, height);
      }

      gl.uniform2f(resolutionLocation, width, height);
    };

    const render = (timeMs) => {
      lastTime = timeMs * 0.001;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, lastTime);
      gl.uniform1f(opacityLocation, 0.22);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const animate = (timeMs) => {
      render(timeMs);
      if (shouldAnimate && !document.hidden) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    const startAnimation = () => {
      if (!animationFrameId && shouldAnimate && !document.hidden) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const handleResize = () => {
      resizeCanvas();
      if (!shouldAnimate) {
        render(lastTime);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    const handleMotionChange = (event) => {
      shouldAnimate = !event.matches;
      if (shouldAnimate) {
        startAnimation();
      } else {
        stopAnimation();
        render(lastTime);
      }
    };

    resizeCanvas();
    render(0);

    if (shouldAnimate && !document.hidden) {
      startAnimation();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    prefersReducedMotion.addEventListener('change', handleMotionChange);

    return () => {
      stopAnimation();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      prefersReducedMotion.removeEventListener('change', handleMotionChange);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  );
}
