const MODEL_CONFIG = [
    { 
        path: 'models/SmallStore.glb', 
        name: 'Small Store', 
        position: new THREE.Vector3(-10, 0, 10), 
        rotationY: 0, 
        scale: 3.5 
    },
    
    { 
        path: 'models/GasPump.glb', 
        name: 'Gas Pump', 
        position: new THREE.Vector3(5, 0, -15), 
        rotationY: Math.PI / 100, 
        scale: 3 
    },
    
    { 
        path: 'models/Van.glb', 
        name: 'Van', 
        position: new THREE.Vector3(5, 0, -9), 
        rotationY: Math.PI / 100, 
        scale: 3 
    },
    
    { 
        path: 'models/MaleSurvivor.glb', 
        name: 'Male Survivor', 
        position: new THREE.Vector3(0, 0.05, 5), 
        rotationY: 0, 
        scale: 3.5 
    }
];

class ZomboidScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.loadingManager = null; 
        this.rainParticles = null; 
        
        this.isMouseDown = false;
        this.previousMouseX = 0;
        this.cameraAngle = Math.PI / 4;
        this.cameraHeight = 35;
        this.cameraDistance = 35; 
        
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0f18, 0.015); 
        this.scene.background = new THREE.Color(0x0a0f18); 

        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onError = (url) => {
            console.error(`❌ CRITICAL ERROR: Failed to load asset: ${url}. Check your file path!`);
            const statusElement = document.getElementById('loading-status');
            if (statusElement) {
                statusElement.textContent = `ERROR: Failed to load: ${url}`;
            }
        };

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.updateCameraPosition();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.createMoon();
        this.addVanSpotLight(); 
        this.createRain(); 
        this.createGrassPlane(this.loadingManager);
        this.createParkingLotPlane(this.loadingManager); 
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this)); 
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('wheel', this.onMouseWheel.bind(this));
    }
    
    updateCameraPosition() {
        const x = this.cameraDistance * Math.cos(this.cameraAngle);
        const z = this.cameraDistance * Math.sin(this.cameraAngle);
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, 0, 0); 
    }
    
    setupLighting() {

        const ambientLight = new THREE.AmbientLight(0x444466, 0.3);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xb0c4de, 0.5); 
        directionalLight.position.set(20, 50, -30);
        directionalLight.castShadow = true;
        
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;

        this.scene.add(directionalLight);
    }
    createMoon() {
        const moonSize = 8; 
        const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);

        moon.position.set(20, 30, -35); 
        this.scene.add(moon);

        const moonLight = new THREE.PointLight(0xb0c4de, 0.6, 150); 
        moonLight.position.copy(moon.position);
        this.scene.add(moonLight);
    }
    
    addVanSpotLight() {
        const lightColor = 0xffffff; 
        const intensity = 50;
        const distance = 40;
        const angle = Math.PI / 4; 
        const penumbra = 0.5; 
        const decay = 2;

        const vanCenterX = 5;
        const vanCenterZ = -9;
        
        const centerLight = new THREE.SpotLight(lightColor, intensity, distance, angle, penumbra, decay);
        centerLight.position.set(vanCenterX, 10, vanCenterZ); 
        
        centerLight.target.position.set(vanCenterX - 12, 1, vanCenterZ);
        centerLight.castShadow = true;
        this.scene.add(centerLight);
        this.scene.add(centerLight.target);
    }


    createRain() {
        const particleCount = 15000;
        const rainGeometry = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * 200 - 100;
            const y = Math.random() * 100 + 50; 
            const z = Math.random() * 200 - 100;
            positions.push(x, y, z);
        }

        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0x90a0c0, 
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        this.scene.add(this.rainParticles);
    }
    
    updateRain() {
        if (!this.rainParticles) return;

        const positions = this.rainParticles.geometry.attributes.position.array;
        const velocity = 2.0; 

        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= velocity; 

            if (positions[i] < 0) {
                positions[i] = 100; 
            }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    createGrassPlane(manager) {
        const textureLoader = new THREE.TextureLoader(manager);
        const grassTexture = textureLoader.load('textures/GrassTexture.jpg');
        
        const repeatSize = 10;
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(repeatSize, repeatSize);

        const grassGeometry = new THREE.BoxGeometry(70, 1, 70); 
        
        const grassMaterial = new THREE.MeshLambertMaterial({ 
            map: grassTexture,
            color: 0x4d5b41, 
        }); 
        
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.position.y = -0.5; 
        grass.receiveShadow = true;
        this.scene.add(grass);
    }

    createParkingLotPlane(manager) {
        const textureLoader = new THREE.TextureLoader(manager);
        const parkingTexture = textureLoader.load('textures/ConcreteFloorTexture.jpg');

        const repeatSize = 5;
        parkingTexture.wrapS = THREE.RepeatWrapping;
        parkingTexture.wrapT = THREE.RepeatWrapping;
        parkingTexture.repeat.set(repeatSize, repeatSize);
        
        const parkingGeometry = new THREE.PlaneGeometry(40, 40); 
        
        const parkingMaterial = new THREE.MeshLambertMaterial({ 
            map: parkingTexture,
            color: 0x2a2a2a, 
            side: THREE.DoubleSide
        }); 
        
        const parkingLot = new THREE.Mesh(parkingGeometry, parkingMaterial);

        parkingLot.rotation.x = -Math.PI / 2;
        parkingLot.position.set(0, 0.01, 0); 
        parkingLot.receiveShadow = true;
        this.scene.add(parkingLot);
        
        this.addParkingLines();
    }
    
    addParkingLines() {
        const lineMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xcccccc, 
            emissive: 0x000000 
        }); 
        
        const lineDimensions = { width: 8, height: 0.01, depth: 0.2 }; 
        
        const parkingLinesGroup = new THREE.Group();
        

        const spacing = 6; 
        const lineCount = 3;

        for (let i = 0; i < lineCount; i++) {
            const lineGeometry = new THREE.BoxGeometry(lineDimensions.width, lineDimensions.height, lineDimensions.depth);
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            
            line.rotation.y = Math.PI / 100; 
            
            line.position.x = 5; 
            line.position.y = 0.02; 
            line.position.z = 14 - (i * spacing); 
            
            line.castShadow = true;
            line.receiveShadow = true;
            
            parkingLinesGroup.add(line);
        }

        this.scene.add(parkingLinesGroup);
    }

    onMouseWheel(event) {
        this.cameraDistance += event.deltaY * 0.05;
        this.cameraDistance = Math.max(15, Math.min(80, this.cameraDistance));
        this.updateCameraPosition();
    }

    onMouseDown(event) {
        if (event.button === 0) { 
            this.isMouseDown = true;
            this.previousMouseX = event.clientX;
        }
    }

    onMouseMove(event) {
        if (this.isMouseDown) {
            const deltaX = event.clientX - this.previousMouseX;
            this.cameraAngle -= deltaX * 0.005;
            this.previousMouseX = event.clientX;
            this.updateCameraPosition();
        }
    }

    onMouseUp() {
        this.isMouseDown = false;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.updateRain(); 
        this.renderer.render(this.scene, this.camera);
    }
}

class ModelLoader {
    constructor(scene, manager) { 
        this.scene = scene;
        this.loader = new THREE.GLTFLoader(manager); 
        this.loadedModelsCount = 0;
        this.totalModels = MODEL_CONFIG.length;
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingPercent = document.getElementById('loading-percent');
    }

    updateLoadingStatus() {
        this.loadedModelsCount++;
        const percent = Math.round((this.loadedModelsCount / this.totalModels) * 100);
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (this.loadingPercent) {
             this.loadingPercent.textContent = `${percent}%`;
        }

        if (this.loadedModelsCount === this.totalModels) {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            }, 500); 
        }
    }

    loadAllModels() {
        MODEL_CONFIG.forEach(config => {
            this.loader.load(
                config.path,
                (gltf) => {
                    const model = gltf.scene;
                    
                    model.position.copy(config.position);
                    model.rotation.y = config.rotationY;
                    model.scale.set(config.scale, config.scale, config.scale);
                    
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.scene.add(model);
                    console.log(`✓ Loaded ${config.name}`);
                    this.updateLoadingStatus();
                },
                (xhr) => {
                },
                (error) => {
                    console.error(`✗ Error loading ${config.name}:`, error);
                }
            );
        });
    }
}

window.addEventListener('load', () => {
    const container = document.getElementById('canvas-container');
    const zomboidScene = new ZomboidScene(container);
    const modelLoader = new ModelLoader(zomboidScene.scene, zomboidScene.loadingManager);
    modelLoader.loadAllModels();
    zomboidScene.animate();
});