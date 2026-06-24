import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeBackground = ({ active = true }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!active || !mountRef.current) return;
    const currentMount = mountRef.current;

    // Early exit on mobile viewports to prevent WebGL overhead
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      console.log("[EduTrack AI]: Mobile screen detected, bypassing 3D WebGL Background canvas.");
      return;
    }

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 8;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Caps pixel ratio for performance
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 10, 30);
    pointLightCyan.position.set(-5, 5, 3);
    scene.add(pointLightCyan);

    const pointLightPurple = new THREE.PointLight(0xa855f7, 12, 30);
    pointLightPurple.position.set(5, -5, 3);
    scene.add(pointLightPurple);

    // 5. Lightweight Glossy Material (Replaces heavy refraction/transmission physical glass shaders)
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.9,
    });

    const meshes = [];

    // Create 3D Glossy Spheres
    const sphereCount = 4;
    for (let i = 0; i < sphereCount; i++) {
      const size = 0.4 + Math.random() * 0.7;
      const geometry = new THREE.SphereGeometry(size, 16, 16); // Lower segment count
      const mesh = new THREE.Mesh(geometry, glassMaterial);

      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3
      );

      mesh.userData = {
        speedX: (Math.random() - 0.5) * 0.003,
        speedY: (Math.random() - 0.5) * 0.003,
        rotSpeedX: Math.random() * 0.006,
        rotSpeedY: Math.random() * 0.006,
        floatOffset: Math.random() * Math.PI * 2,
        type: 'sphere'
      };

      scene.add(mesh);
      meshes.push(mesh);
    }

    // Floating Books (Stylized box)
    const bookCount = 2;
    const bookMaterial = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.5
    });

    for (let i = 0; i < bookCount; i++) {
      const geometry = new THREE.BoxGeometry(0.7, 0.9, 0.2);
      const mesh = new THREE.Mesh(geometry, bookMaterial);
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 2
      );

      mesh.userData = {
        speedX: (Math.random() - 0.5) * 0.002,
        speedY: (Math.random() - 0.5) * 0.002,
        rotSpeedX: 0.003,
        rotSpeedY: 0.005,
        floatOffset: Math.random() * Math.PI * 2,
        type: 'book'
      };

      scene.add(mesh);
      meshes.push(mesh);
    }

    // Floating Graduation Cap
    const capGroup = new THREE.Group();
    const boardGeo = new THREE.BoxGeometry(1.0, 0.04, 1.0);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0.6
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.rotation.x = Math.PI / 12;
    capGroup.add(board);

    const skullGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.25, 16);
    const skullMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.6
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.y = -0.15;
    capGroup.add(skull);

    capGroup.position.set(0, 1.2, 1);
    capGroup.userData = {
      speedX: 0.001,
      speedY: 0.002,
      rotSpeedX: 0.001,
      rotSpeedY: 0.003,
      floatOffset: 0,
      type: 'cap'
    };
    scene.add(capGroup);
    meshes.push(capGroup);

    // Star particles (Reduced count from 120 to 45)
    const particleCount = 45;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 6;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.5
    });

    const starParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(starParticles);

    // Mouse Parallax Interaction (Throttled update)
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Drift star points
      const positions = starParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.002;
        if (positions[i] > 5) {
          positions[i] = -5;
        }
      }
      starParticles.geometry.attributes.position.needsUpdate = true;

      // Animate meshes float
      meshes.forEach((mesh) => {
        const u = mesh.userData;
        const drift = Math.sin(elapsedTime * 0.6 + u.floatOffset) * 0.003;
        mesh.position.y += drift + u.speedY;
        mesh.position.x += u.speedX;

        if (Math.abs(mesh.position.x) > 6) u.speedX *= -1;
        if (Math.abs(mesh.position.y) > 4) u.speedY *= -1;

        mesh.rotation.x += u.rotSpeedX;
        mesh.rotation.y += u.rotSpeedY;
      });

      // Eased camera mouse parallax
      camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 2.5 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      starParticles.geometry.dispose();
      particleMaterial.dispose();
      glassMaterial.dispose();
      bookMaterial.dispose();
      boardGeo.dispose();
      boardMat.dispose();
      skullGeo.dispose();
      skullMat.dispose();
    };
  }, [active]);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden" />;
};

export default ThreeBackground;
