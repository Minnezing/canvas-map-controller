class CanvasController {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.context = this.canvas.getContext("2d");
        this.canvasSize = {
            left: null,
            right: null,
            top: null,
            bottom: null
        };

        this.camera = {
            position: { x: 0, y: 0 },
            zoom: 1
        };

        this.zoomSensitivity = 1;
        this.minZoom = 0.01;
        this.maxZoom = 10;
        this.zoomAnimationTime = 0.5;
        this.zoomMaxVelocity = 10;

        this.zoomVelocity = 0;
        this.zoomAnimationStarted = false;
        this.zoomTarget = this.camera.zoom;
        this.zoomTargetPosition = { x: 0, y: 0 };
        this.lastZoomTime = performance.now();
        this.zoomLastDirection = 1;

        this.layers = [new Layer("default", "Default")];
        this.assets = new AssetsManager();

        const wheelCallback = (e) => {
            e.preventDefault();
            let direction = -Math.sign(e.deltaY);
            
            if (performance.now() - this.lastZoomTime > 500 || this.zoomLastDirection != direction) this.zoomVelocity = 0;
            this.zoomVelocity = Math.min(this.zoomVelocity + 1, this.zoomMaxVelocity);

            this.zoomLastDirection = direction;
            this.lastZoomTime = performance.now();
            
            const zoomChangingFactors = Math.exp(direction * this.zoomSensitivity * Math.log(this.zoomVelocity + 1) * 0.1);
            const newZoom = clamp(this.zoomTarget * zoomChangingFactors, this.minZoom, this.maxZoom);

            this.smoothZoomTo(
                newZoom,
                this.getGlobalX(e.clientX),
                this.getGlobalY(e.clientY)
            );
        }
        this.canvas.addEventListener("wheel", wheelCallback);

        let draggingStartPosition = { x: null, y: null };
        let draggingTargetPosition = { x: null, y: null };
        let cameraStartPosition = { x: null, y: null };
        this.canvas.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.canvas.style.cursor = "move";
            draggingStartPosition = { x: this.getGlobalX(e.clientX), y: this.getGlobalY(e.clientY) };
            Object.assign(cameraStartPosition, this.camera.position);
        });
        
        this.canvas.addEventListener("mouseup", (e) => {
            e.preventDefault();
            this.canvas.style.cursor = "";
            draggingStartPosition = { x: null, y: null };
        })

        let draggingAnimationId;
        let draggingAnimationStarted = false;

        const mousemoveCallback = (e) => {
            if (draggingStartPosition.x === null) return;

            // console.log(draggingStartPosition.x, this.getGlobalX(e.clientX))

            // TODO: связать с targetposition зума
            draggingTargetPosition.x = cameraStartPosition.x - (this.getGlobalX(e.clientX, cameraStartPosition) - draggingStartPosition.x);
            draggingTargetPosition.y = cameraStartPosition.y - (this.getGlobalY(e.clientY, cameraStartPosition) - draggingStartPosition.y);

            if (draggingAnimationStarted) return;

            e.preventDefault();
            draggingAnimationStarted = true;
            
            let lastFrameTime = performance.now();

            const animation = () => {
                let now = performance.now();

                let newX = smoothDump(this.camera.position.x, draggingTargetPosition.x, .6, Math.max((now - lastFrameTime) / 1000, 1/60));
                let newY = smoothDump(this.camera.position.y, draggingTargetPosition.y, .6, Math.max((now - lastFrameTime) / 1000, 1/60));

                lastFrameTime = now;

                this.setPositionTo(newX, newY);

                if (newX != draggingTargetPosition.x) {
                    draggingAnimationId = requestAnimationFrame(animation);
                } else {
                    draggingAnimationStarted = false;
                    cancelAnimationFrame(draggingAnimationId);
                }

                this.render();
            }

            draggingAnimationId = requestAnimationFrame(animation);
            
            this.render();
        }

        this.canvas.addEventListener("mousemove", mousemoveCallback)

        this.setPositionTo(0, 0);
        this.render();
    }

    registerEvents() {

    }

    // Canvas settings
    setPositionTo(x, y) {
        if (this.canvasSize.right !== null && x + (this.canvas.width / this.camera.zoom) >= this.canvasSize.right) {
            this.camera.position.x = this.canvasSize.right - (this.canvas.width / this.camera.zoom);
        } else if (this.canvasSize.left !== null && x <= this.canvasSize.left) {
            this.camera.position.x = this.canvasSize.left;
        } else {
            this.camera.position.x = x;
        }


        if (this.canvasSize.top !== null && y <= this.canvasSize.top) {
            this.camera.position.y = this.canvasSize.top;
        } else if (this.canvasSize.bottom !== null && y <= this.canvasSize.bottom) {
            this.camera.position.y = this.canvasSize.bottom - (this.canvas.height / this.camera.zoom);
        } else {
            this.camera.position.y = y;
        }
    }

    getLayer(id) {
        return this.layers.find(l => l.id == id)
    }

    smoothZoomTo(zoomTarget, centerX, centerY) {
        this.zoomTarget = zoomTarget;
        this.zoomTargetPosition.x = centerX;
        this.zoomTargetPosition.y = centerY;

        if (this.zoomAnimationStarted || this.zoomTarget == this.minZoom || this.zoomTarget == this.maxZoom) return;

        this.zoomAnimationStarted = true;
        let lastFrameTime = performance.now();
        
        let animationId;
        const animate = () => {
            let now = performance.now();
            
            let oldCenterXProjection = this.getProjectionX(this.zoomTargetPosition.x);
            let oldCenterYProjection = this.getProjectionY(this.zoomTargetPosition.y);

            this.camera.zoom = smoothDump(
                this.camera.zoom,
                this.zoomTarget,
                this.zoomAnimationTime,
                Math.max((now - lastFrameTime) / 1000, 1/60)
            );
            
            let newCenterX = this.getGlobalX(oldCenterXProjection);
            let newCenterY = this.getGlobalY(oldCenterYProjection);
            
            this.setPositionTo(
                this.camera.position.x - (newCenterX - this.zoomTargetPosition.x),
                this.camera.position.y - (newCenterY - this.zoomTargetPosition.y)
            );

            lastFrameTime = now;

            if (this.camera.zoom != this.zoomTarget) {
                animationId = requestAnimationFrame(animate);
            } else {
                this.zoomAnimationStarted = false;
                cancelAnimationFrame(animationId);
            }

            this.render();
        }
        animationId = requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    render() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.layers.filter(layer => !layer.hidden).forEach(layer => {
            layer.objects
                // .filter(object => ((object.x >= this.camera.position.x) && (object.x <= this.camera.position.x + (this.canvas.width / this.camera.scale))) ||
                //                 ((object.x + object.width >= this.camera.position.x) && (object.x + object.width <= this.camera.position.x + (this.canvas.width / this.camera.scale))) ||
                //                 ((object.x < this.camera.position.x) && (object.x + object.width > this.camera.position.x + (this.canvas.width / this.camera.scale))) ||
                //                 ((object.y >= this.camera.position.y) && (object.y <= this.camera.position.y + (this.canvas.height / this.camera.scale))) ||
                //                 ((object.y + object.height >= this.camera.position.y) && (object.y + object.height <= this.camera.position.y + (this.canvas.height / this.camera.scale))) ||
                //                 ((object.y < this.camera.position.y) && (object.y + object.height > this.camera.position.y + (this.canvas.height / this.camera.scale))))
                .forEach(object => {
                    const asset = this.assets.get(object.assetId);
                    this.context.drawImage(
                        asset.canvas.canvas,
                        asset.x,
                        asset.y,
                        asset.width,
                        asset.height,
                        this.getProjectionX(object.x),
                        this.getProjectionY(object.y),
                        asset.width * object.scale * this.camera.zoom,
                        asset.height * object.scale * this.camera.zoom
                    )
                })                          
        })
    }

    getProjectionX(x, zero=this.camera.position) {
        return (x - zero.x) * this.camera.zoom;
    }
    getProjectionY(y, zero=this.camera.position) {
        return (y - zero.y) * this.camera.zoom;
    }
    getGlobalX(x, zero=this.camera.position) {
        return (x / this.camera.zoom) + zero.x;
    }
    getGlobalY(y, zero=this.camera.position) {
        return (y / this.camera.zoom) + zero.y;
    }
}

class Layer {
    constructor(id, name) {
        this.name = name;
        this.objects = [];
        this.id = id;
        this.hidden = false;
    }
    addObject(assetId, x, y, scale=1) {
        this.objects.push({ assetId, x, y, scale });
    }
}

class AssetsManager {
    constructor() {
        this.assets = new Map();
        this.canvases = [];
    }

    get(id) {
        return this.assets.get(id);
    }

    async loadAssets(data) {
        for (let i = 0; i < data.length; i++) {
            const { id, url } = data[i];
            const img = new Image();
            img.src = url;
            
            try {
                await img.decode();
            } catch (err) {
                throw Error(`При обработке ассета "${id}" возникла ошибка\n${err}`)
            }

            let position;
            for (let j = 0; j < this.canvases.length; j++) {
                position = this.canvases[j].findSpace(img.width, img.height, this.assets);
                if (position) break;
            }
            
            if (!position) {
                let canvas = new AssetsCanvas(this.canvases.length, (img.width > 4096 ? img.width : 4096), (img.height > 4096 ? img.height : 4096))
                position = { x: 0, y: 0, canvas: canvas };
                this.canvases.push(canvas);
            }
            
            position.canvas.context.drawImage(img, position.x, position.y);
            this.assets.set(id, { ...position, width: img.width, height: img.height })
        }
    }
}

class AssetsCanvas {
    constructor(id, width=4096, height=4096) {
        this.canvas = new OffscreenCanvas(width, height);
        this.context = this.canvas.getContext("2d");
        this.width = width;
        this.height = height;
        this.id = id;
        this.levels = [0];
    }

    findSpace(width, height, assets) {
        let assetsInThisCanvas = [...assets.values()].filter(a => a.canvas.id == this.id);
        let currentLevel = 0;
        while (true) {
            let assetsOnThisLevel = assetsInThisCanvas.filter(a => a.y == this.levels[currentLevel]);
            let residualWidth = this.width - assetsOnThisLevel.reduce((acc, cv) => acc + cv.width, 0);

            let residualHeight = (this.levels[currentLevel + 1] ?? this.height) - this.levels[currentLevel];
            if (width <= residualWidth && height <= residualHeight) {
                return { x: this.width - residualWidth, y: this.levels[currentLevel], canvas: this };
            }

            currentLevel += 1;
            if (currentLevel < this.levels.length && height <= residualHeight) return;
            if (currentLevel < this.levels.length) {
                let levelHeigth = Math.max(assetsOnThisLevel.map(a => a.height));
                let newLevel = this.levels[currentLevel - 1] + levelHeigth;
                if (newLevel > this.height) return;
                this.levels.push(newLevel);
            }
        }
    }
}

const convergenceAccuracy = 0.001
function smoothDump(current, target, timeInSeconds, dt) {
    if (Math.abs(target - current) < convergenceAccuracy)  {
        return target;
    }

    return current + (target - current) * dt * -Math.log(convergenceAccuracy) / timeInSeconds;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}