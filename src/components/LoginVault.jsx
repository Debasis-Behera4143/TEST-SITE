import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const LoginVault = ({ animationType = 'cricket', onExplode }) => {
  const mountRef = useRef(null);
  const [phase, setPhase] = useState('locked'); // 'locked' | 'animating' | 'exploding' | 'done'

  useEffect(() => {
    // Immediately explode and bypass the 3D WebGL sequence on mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      console.log("[EduTrack AI]: Mobile screen detected, skipping 3D vault break animation.");
      onExplode();
      return;
    }

    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa855f7, 20, 100);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 15, 100);
    cyanLight.position.set(5, 5, 5);
    scene.add(cyanLight);

    // 5. Build Procedural 3D Vault Lock
    const vaultGroup = new THREE.Group();
    
    // Central metallic disc
    const discGeo = new THREE.CylinderGeometry(2, 2, 0.4, 32);
    const discMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.9,
      clearcoat: 1.0,
      transmission: 0.1,
      thickness: 0.5
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    vaultGroup.add(disc);

    // Concentric Neon Rings
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const ringGeo1 = new THREE.TorusGeometry(2.3, 0.08, 8, 48);
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    vaultGroup.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true });
    const ringGeo2 = new THREE.TorusGeometry(2.6, 0.05, 6, 36);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    vaultGroup.add(ring2);

    // Lock spokes
    const spokeGeo = new THREE.BoxGeometry(0.3, 4.2, 0.2);
    const spoke1 = new THREE.Mesh(spokeGeo, discMat);
    const spoke2 = new THREE.Mesh(spokeGeo, discMat);
    spoke2.rotation.z = Math.PI / 2;
    vaultGroup.add(spoke1);
    vaultGroup.add(spoke2);

    // Center glowing node
    const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.z = 0.25;
    vaultGroup.add(core);

    scene.add(vaultGroup);

    // 6. Action Elements (Cricket Bat, Football, Rocket, Laser)
    let batGroup = new THREE.Group();
    let projectile = null;
    let particles = [];
    let laserLines = [];

    // Setup elements based on selected mode
    if (animationType === 'cricket') {
      // Cricket Bat: Cylinder Handle + Box Blade
      const bladeGeo = new THREE.BoxGeometry(0.4, 2.5, 0.2);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // Wooden
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = -1.25;
      batGroup.add(blade);

      const handleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 16);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.y = 0.6;
      batGroup.add(handle);

      // Position bat top left, ready to swing
      batGroup.position.set(-6, 4, 1);
      batGroup.rotation.z = -Math.PI / 4;
      scene.add(batGroup);

      // Red Cricket Ball
      const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
      const ballMat = new THREE.MeshPhysicalMaterial({ color: 0xd91a1a, roughness: 0.1, clearcoat: 1.0 });
      projectile = new THREE.Mesh(ballGeo, ballMat);
      projectile.position.set(-4.5, 0.8, 1);
      scene.add(projectile);

    } else if (animationType === 'football') {
      // Soccer Ball
      const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, wireframe: false });
      projectile = new THREE.Mesh(ballGeo, ballMat);
      projectile.position.set(-6, -4, 2);
      scene.add(projectile);

      // Add a couple black panels to look soccer-like
      const panelsGeo = new THREE.SphereGeometry(0.36, 12, 12);
      const panelsMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
      const panels = new THREE.Mesh(panelsGeo, panelsMat);
      projectile.add(panels);

    } else if (animationType === 'rocket') {
      // Space Rocket
      const rocketGroup = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      rocketGroup.add(body);

      const tipGeo = new THREE.ConeGeometry(0.2, 0.4, 16);
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xec4899 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.8;
      rocketGroup.add(tip);

      const wingGeo = new THREE.BoxGeometry(0.6, 0.1, 0.4);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.y = -0.5;
      rocketGroup.add(wing);

      rocketGroup.position.set(0, -6, 2);
      rocketGroup.rotation.z = 0; // point up
      projectile = rocketGroup;
      scene.add(projectile);

    } else if (animationType === 'laser') {
      // Set up glowing laser emitter rods on sides
      const rodGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const leftRod = new THREE.Mesh(rodGeo, rodMat);
      leftRod.position.set(-6, 0, 1);
      leftRod.rotation.z = Math.PI / 2;
      scene.add(leftRod);

      const rightRod = new THREE.Mesh(rodGeo, rodMat);
      rightRod.position.set(6, 0, 1);
      rightRod.rotation.z = -Math.PI / 2;
      scene.add(rightRod);
    }

    // 7. Time and Animation loops
    let clock = new THREE.Clock();
    let animProgress = 0;
    let animationFrameId;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      const delta = clock.getDelta();
      
      // Idle rotate the vault concentric rings
      ring1.rotation.z += 0.01;
      ring2.rotation.z -= 0.015;
      vaultGroup.rotation.y = Math.sin(clock.getElapsedTime()) * 0.15;

      // ANIMATION STAGES
      if (phase === 'animating') {
        animProgress += delta * 1.5; // speed factor

        if (animationType === 'cricket') {
          // 1. Swing bat down
          if (animProgress < 0.5) {
            batGroup.rotation.z = -Math.PI / 4 + (animProgress * 2) * (Math.PI / 2);
            batGroup.position.x = -6 + (animProgress * 2) * 2;
            batGroup.position.y = 4 - (animProgress * 2) * 3;
          } else {
            // Strike has occurred, fly ball towards center
            const ballProgress = (animProgress - 0.5) * 2; // scale to [0,1]
            if (ballProgress < 1.0) {
              projectile.position.x = -4.5 + ballProgress * 4.5;
              projectile.position.y = 0.8 - ballProgress * 0.8;
              projectile.position.z = 1.0 - ballProgress * 1.0;
              // spin ball
              projectile.rotation.x += 0.2;
              projectile.rotation.y += 0.1;
            } else {
              // Hit lock! Transition to explosion
              setPhase('exploding');
            }
          }

        } else if (animationType === 'football') {
          // Arc football from bottom-left to center
          if (animProgress < 1.0) {
            projectile.position.x = -6 + animProgress * 6;
            // parabolic arc path: y = -4 + 7*x - 3*x^2
            projectile.position.y = -4 + (animProgress * 6) - (animProgress * animProgress * 2);
            projectile.position.z = 2 - animProgress * 2;
            projectile.rotation.x += 0.15;
            projectile.rotation.y += 0.15;
          } else {
            setPhase('exploding');
          }

        } else if (animationType === 'rocket') {
          // Launch rocket straight up into vault lock center
          if (animProgress < 1.0) {
            projectile.position.y = -6 + animProgress * 6;
            projectile.position.z = 2 - animProgress * 2;
            
            // Spawn tiny smoke fire particles
            const smokeGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8);
            const smokeMat = new THREE.MeshBasicMaterial({
              color: Math.random() > 0.4 ? 0xff5500 : 0xffbb00,
              transparent: true,
              opacity: 0.8
            });
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.set(
              projectile.position.x + (Math.random() - 0.5) * 0.2,
              projectile.position.y - 0.6,
              projectile.position.z
            );
            scene.add(smoke);
            particles.push({
              mesh: smoke,
              vx: (Math.random() - 0.5) * 0.05,
              vy: -0.1 - Math.random() * 0.1,
              life: 1.0
            });
          } else {
            setPhase('exploding');
          }

        } else if (animationType === 'laser') {
          // Draw charging laser lines converging on center
          if (animProgress < 0.6) {
            // Laser charge sparks
          } else if (animProgress < 1.0) {
            // Draw neon cylinders connecting rods to vault center
            if (laserLines.length === 0) {
              const laserMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
              const leftLaserGeo = new THREE.CylinderGeometry(0.08, 0.08, 6, 8);
              const leftLaser = new THREE.Mesh(leftLaserGeo, laserMat);
              leftLaser.position.set(-3, 0, 0.5);
              leftLaser.rotation.z = Math.PI / 2;
              scene.add(leftLaser);
              laserLines.push(leftLaser);

              const rightLaserGeo = new THREE.CylinderGeometry(0.08, 0.08, 6, 8);
              const rightLaser = new THREE.Mesh(rightLaserGeo, laserMat);
              rightLaser.position.set(3, 0, 0.5);
              rightLaser.rotation.z = -Math.PI / 2;
              scene.add(rightLaser);
              laserLines.push(rightLaser);
            }
            // Glow central node
            core.scale.addScalar(0.08);
          } else {
            // Clear lines
            laserLines.forEach(l => scene.remove(l));
            setPhase('exploding');
          }
        }
      }

      // EXPLOSION STAGE
      if (phase === 'exploding') {
        // Hide standard meshes
        scene.remove(vaultGroup);
        if (projectile) scene.remove(projectile);
        if (batGroup) scene.remove(batGroup);

        // Spawn neon shards particles
        const particleCount = 200;
        const geom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        
        for (let i = 0; i < particleCount; i++) {
          const color = Math.random() > 0.5 ? 0x06b6d4 : Math.random() > 0.5 ? 0xa855f7 : 0xec4899;
          const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1.0
          });
          const shard = new THREE.Mesh(geom, mat);
          shard.position.set(0, 0, 0.5);
          
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          const pitch = (Math.random() - 0.5) * Math.PI;

          scene.add(shard);
          particles.push({
            mesh: shard,
            vx: Math.cos(angle) * Math.cos(pitch) * speed * delta,
            vy: Math.sin(angle) * Math.cos(pitch) * speed * delta,
            vz: Math.sin(pitch) * speed * delta,
            life: 1.0 + Math.random() * 0.8
          });
        }

        // Change state to avoid spawning multiple times
        setPhase('done');
      }

      // Physics animation of particles list
      particles.forEach((p, idx) => {
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        if (p.vz) p.mesh.position.z += p.vz;
        p.life -= delta * 0.7; // fade life
        p.mesh.material.opacity = Math.max(0, p.life);

        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          particles.splice(idx, 1);
        }
      });

      // End of explosion loop
      if (phase === 'done' && particles.length === 0) {
        cancelAnimationFrame(animationFrameId);
        onExplode(); // Trigger dashboard route entry
        return;
      }

      renderer.render(scene, camera);
    };

    tick();

    // Trigger animation start immediately
    setTimeout(() => {
      setPhase('animating');
    }, 500);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      // Clean up geometries
      discGeo.dispose();
      discMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      spokeGeo.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    };
  }, [animationType, phase, onExplode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
      
      {/* HUD Message */}
      <div className="absolute top-20 text-center space-y-2 z-10 pointer-events-none">
        <h2 className="text-3xl font-display font-extrabold tracking-wider bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink bg-clip-text text-transparent uppercase animate-pulse">
          Unlocking Secure Session Core
        </h2>
        <p className="text-xs tracking-widest text-slate-500 uppercase font-mono">
          Interactive login break: {animationType.toUpperCase()} MODE
        </p>
      </div>

      <div ref={mountRef} className="w-full h-full max-h-[600px] max-w-[800px] relative" />
      
      {/* Skip button in case they don't want to wait */}
      <button
        onClick={onExplode}
        className="absolute bottom-12 px-6 py-2 rounded-xl bg-slate-900/60 border border-white/10 hover:bg-slate-900 text-xs font-semibold text-slate-400 z-10 transition-all"
      >
        Skip Break Animation
      </button>
    </div>
  );
};

export default LoginVault;
