var m3D = (function () {
    // ---- private vars ----
    var ctx, points, faces, nPoints, nFaces, scene, wireframe = false, vRotationEnabled = false, targetImage, imageOverBak, background, screen, loaderFunction = undefined, mouse = { x: 0, xd: 0, y: 0 };
    var imageOver; // Declare imageOver globally within the module

    // ---- camera ----
    var camera = { x: 0, z: 0, cosh: 0, sinh: 0, angleTargetX: 0, angleTargetZ: 0, angleH: 0, angleV: 0, focalLength: 700 };

    /* ==== main loop ==== */
    var run = function () {
        // ---- camera movements ----
        camera.movements();
        // ---- gradient background ----
        if (vRotationEnabled || !background) {
            var horizon = 0.5 + camera.angleV * 1.2;
            if (horizon < 0) horizon = 0;
            else if (horizon > 1) horizon = 1;
            background = ctx.createLinearGradient(0, 0, 0, screen.height);
            background.addColorStop(0, scene.ceilingColor);
            background.addColorStop(horizon, scene.horizonColor);
            background.addColorStop(horizon, scene.horizonColor);
            background.addColorStop(1, scene.groundColor);
        }
        // ---- fill background ----
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, screen.width, screen.height);
        // ---- points 3D to 2D projection ----
        var i = nPoints;
        while (i--) points[i].projection();
        // ---- compute faces ----
        imageOver = false;
        i = nFaces;
        while (i--) faces[i].compute();
        // ---- z sorting ----
        faces.sort(function (p0, p1) {
            return p1.zIndex - p0.zIndex;
        });
        // ---- draw faces in z order ----
        for (var i = 0, p; (p = faces[i++]);) p.visible && p.draw();
        // ---- mouse over cursor ----
        if (!imageOverBak) {
            if (imageOver) {
                screen.container.style.cursor = "pointer";
                document.getElementById("dynamic_info").innerHTML = imageOver.name || "";
                if (imageOver.caption) {
                    document.getElementById("dynamic_info2").innerHTML = imageOver.caption;
                }
            }
        } else if (!imageOver) {
            screen.container.style.cursor = "default";
            document.getElementById("dynamic_info").innerHTML = "Click on pictures to move around. Click on open doors to change rooms.";
            document.getElementById('dynamic_info2').style.visibility = 'hidden';
        }
        imageOverBak = imageOver;
        // ---- loop ----
        setTimeout(run, 16);
    };

    /* ==== Camera translations and rotations ==== */
    camera.movements = function () {
        // ---- translation ----
        this.x += (this.targetX - this.x) * 0.05;
        this.z += (this.targetZ - this.z) * 0.05;
        this.normalLength = Math.sqrt(this.x * this.x + this.z * this.z);
        // ---- Y axis Rotation ----
        var angleH = ((mouse.x - mouse.xd) / screen.md + Math.atan2(this.angleTargetX - this.x, this.angleTargetZ - this.z)) % (2 * Math.PI);
        // ---- normalize quadran ----
        if (Math.abs(angleH - this.angleH) > Math.PI) {
            if (angleH < this.angleH) this.angleH -= 2 * Math.PI;
            else this.angleH += 2 * Math.PI;
        }
        // ---- easing and trigo ----
        this.angleH += (angleH - this.angleH) * 0.1;
        this.cosh = Math.cos(this.angleH);
        this.sinh = Math.sin(this.angleH);
        // ---- X axis Rotation ----
        if (vRotationEnabled) {
            this.angleV += ((screen.mh - mouse.y) * 0.001 - this.angleV) * 0.1;
            this.cosv = Math.cos(this.angleV);
            this.sinv = Math.sin(this.angleV);
        }
    };

    /////////////////////////////////////////////////////////////////////////////////////
    /* ==== points constructor ==== */
    var Point = function (x, y, z, tx, ty) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.tx = tx;
        this.ty = ty;
        this.projection();
    };

    /* ==== bisection constructor ==== */
    var Bisection = function (p0, p1) {
        this.x = (p1.x + p0.x) * 0.5;
        this.y = (p1.y + p0.y) * 0.5;
        this.z = (p1.z + p0.z) * 0.5;
        this.tx = (p1.tx + p0.tx) * 0.5;
        this.ty = (p1.ty + p0.ty) * 0.5;
        this.projection();
    };

    /* ==== 3D to 2D projection ==== */
    Point.prototype.projection = Bisection.prototype.projection = function () {
        // ---- 3D coordinates ----
        var nx = this.x - camera.x;
        var nz = this.z - camera.z;
        // ---- horizontal rotation ----
        var tx = camera.cosh * nx - camera.sinh * nz;
        this.zp = camera.sinh * nx + camera.cosh * nz;
        if (vRotationEnabled) {
            // ---- vertical rotation enabled ----
            var ty = camera.cosv * this.y - camera.sinv * this.zp;
            this.zp = camera.sinv * this.y + camera.cosv * this.zp;
        } else {
            // ---- vertical rotation disabled ----
            ty = this.y;
        }
        // ---- 2D projection ----
        this.scale = camera.focalLength / Math.max(1, this.zp);
        this.xp = screen.mw + tx * this.scale;
        this.yp = screen.mh - ty * this.scale;
    };

    /* ==== add new point ==== */
    var addPoint = function (x, y, z, tx, ty) {
        var i = 0, p;
        while ((p = points[i++])) {
            // return point
            if (x == p.x && y == p.y && z == p.z) return p;
        }
        // create new point
        nPoints++;
        points.push((p = new Point(x, y, z, tx, ty)));
        return p;
    };

    /////////////////////////////////////////////////////////////////////////////////////
    /* ==== 3D image constructor ==== */
    var ProjectedImage = function (face, p) {
        for (var i in p) this[i] = p[i];
        this.face = face;
        // ---- target position when selected ----
        this.targetX = this.x + Math.cos((this.angle / 180) * Math.PI) * this.distView;
        this.targetZ = this.z + Math.sin((this.angle / 180) * Math.PI) * this.distView;
        // ---- create canvas image ----
        this.srcImg = new Image();
        this.srcImg.src = scene.imagesPath + p.src;
        this.caption = p.caption || ""; // Add this line to handle caption
        // ---- center point ----
        this.pc = new Point(this.x, this.y, this.z);
    };

    /* ==== target image ==== */
    ProjectedImage.prototype.select = function () {
        targetImage = imageOver;
        camera.targetX = targetImage.targetX;
        camera.targetZ = targetImage.targetZ;
        camera.angleTargetX = targetImage.x;
        camera.angleTargetZ = targetImage.z;
        mouse.xd = mouse.x;
        var name = targetImage.name || "";
        document.getElementById("dynamic_info").innerHTML = name;
        var caption = targetImage.caption || "";
        document.getElementById("dynamic_info2").innerHTML = caption;
        document.getElementById("dynamic_info2").style.visibility = 'visible';
    };

    /* ==== loading image ==== */
    ProjectedImage.prototype.loading = function () {
        if (this.srcImg.complete) {
            this.face.image = this;
            this.face.preImage = false;
            // ---- get image size ----
            var zoom = this.zoom || 1;
            var tw = this.srcImg.width * zoom * 0.5;
            var th = this.srcImg.height * zoom * 0.5;
            // ---- create points ----
            var dx = Math.sin((this.angle / 180) * Math.PI);
            var dz = Math.cos((this.angle / 180) * Math.PI);
            this.p0 = addPoint(this.x + tw * dx, this.y + th, this.z - tw * dz, 0, 0);
            this.p1 = addPoint(this.x - tw * dx, this.y + th, this.z + tw * dz, this.srcImg.width, 0);
            this.p2 = addPoint(this.x - tw * dx, this.y - th, this.z + tw * dz, this.srcImg.width, this.srcImg.height);
            this.p3 = addPoint(this.x + tw * dx, this.y - th, this.z - tw * dz, 0, this.srcImg.height);
        }
    };

    /* ==== draw projected image ==== */
    ProjectedImage.prototype.draw = function () {
        var image = this.srcImg, k = 0;
        /* ==== recursive triangulation ===== */
        var triangulate = function (p0, p1, p2, level) {
            if (--level === 0) {
                var ox = offsetX[k];
                var oy = offsetY[k++];
                // ---- clipping ----
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(p0.xp + ox, p0.yp + oy);
                ctx.lineTo(p1.xp + ox, p1.yp + oy);
                ctx.lineTo(p2.xp + ox, p2.yp + oy);
                ctx.clip();
                // ---- transform ----
                var d = p0.tx * (p2.ty - p1.ty) - p1.tx * p2.ty + p2.tx * p1.ty + (p1.tx - p2.tx) * p0.ty;
                if (d !== 0) { // Ensure d is not zero
                    ctx.transform(
                        -(p0.ty * (p2.xp - p1.xp) - p1.ty * p2.xp + p2.ty * p1.xp + (p1.ty - p2.ty) * p0.xp) / d, // m11
                        (p1.ty * p2.yp + p0.ty * (p1.yp - p2.yp) - p2.ty * p1.yp + (p2.ty - p1.ty) * p0.yp) / d, // m12
                        (p0.tx * (p2.xp - p1.xp) - p1.tx * p2.xp + p2.tx * p1.xp + (p1.tx - p2.tx) * p0.xp) / d, // m21
                        -(p1.tx * p2.yp + p0.tx * (p1.yp - p2.yp) - p2.tx * p1.yp + (p2.tx - p1.tx) * p0.yp) / d, // m22
                        (p0.tx * (p2.ty * p1.xp - p1.ty * p2.xp) + p0.ty * (p1.tx * p2.xp - p2.tx * p1.xp) + (p2.tx * p1.ty - p1.tx * p2.ty) * p0.xp) / d, // dx
                        (p0.tx * (p2.ty * p1.yp - p1.ty * p2.yp) + p0.ty * (p1.tx * p2.yp - p2.tx * p1.yp) + (p2.tx * p1.ty - p1.tx * p2.ty) * p0.yp) / d // dy
                    );
                    if (wireframe) {
                        // ---- wireframe mode ----
                        ctx.closePath();
                        ctx.strokeStyle = "#fff";
                        ctx.stroke();
                    } else {
                        ctx.drawImage(image, 0, 0);
                    }
                }
                ctx.restore();
            } else {
                // ---- subdivision ----
                var p3 = new Bisection(p0, p1);
                var p4 = new Bisection(p1, p2);
                var p5 = new Bisection(p2, p0);
                // ---- recursive call ----
                triangulate(p0, p3, p5, level);
                triangulate(p3, p1, p4, level);
                triangulate(p5, p4, p2, level);
                triangulate(p5, p3, p4, level);
            }
        };

        // ---- distance from camera ----
        var dx = this.pc.x - camera.x;
        var dz = this.pc.z - camera.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        // ---- adapt tessellation quality ----
        var level, offsetX, offsetY;

        if (dist > 1000) {
            // ---- 8 triangles ----
            level = 2;
            offsetX = [1, -1, -1, 0, 2, 0, 2, 1];
            offsetY = [2, 2, 0, 1, 1, -1, -1, 0];
        } else {
            // ---- 32 triangles ----
            level = 3;
            offsetX = [
                3, 1, 1, 2, -1, -3, -3, -2, -1, -3, -3, -2, 0, 0, -2, -1, 4, 2, 4, 3, 0,
                -2, 0, -1, 4, 2, 4, 3, 3, 1, 1, 2,
            ];
            offsetY = [
                4, 4, 2, 3, 4, 4, 2, 3, 0, 0, -2, -1, 1, 3, 1, 2, 3, 1, 1, 2, -1, -3,
                -3, -2, -1, -3, -3, -2, 0, 0, -2, -1,
            ];
        }

        // ---- href ----
        if (targetImage === this && this.href && dist <= this.distView + 100) {
            initGeometry(this.href)
                .then(() => {
                    var exitType = this.exit || 0;
                    console.log("exit to", this.exitTo);

                    if (this.exitTo) {
                        if (this.exitTo === "east") {
                            camera.x = 1500;
                            camera.z = 0;
                            camera.targetX = 500;
                            camera.targetZ = 0;
                        }

                        if (this.exitTo === "west") {
                            camera.x = -1500;
                            camera.z = 0;
                            camera.targetX = -500;
                            camera.targetZ = 0;
                        }

                        if (this.exitTo === "south") {
                            camera.x = 0;
                            camera.z = -1500;
                            camera.targetX = 0;
                            camera.targetZ = -500;
                        }

                        if (this.exitTo === "north") {
                            camera.x = 0;
                            camera.z = 1500;
                            camera.targetX = 0;
                            camera.targetZ = 500;
                        }

                        camera.angleTargetX = camera.targetX;
                        camera.angleTargetZ = camera.targetZ;
                    } else if (exitType == "forward") {
                        camera.x = this.exitStartX || scene.startX || 0; // need this for steady start forward
                        camera.z = this.exitStartZ || scene.startZ || 0; // without this we will back up a little
                        camera.targetX = this.exitTargetX || scene.targetX || 0; // these camera.targets put us in the right ...
                        camera.targetZ = this.exitTargetZ || scene.targetZ || 0; // forward landing position
                        camera.angleH = 0;
                        camera.angleTargetX = 0;
                        camera.angleTargetZ = 0;
                        mouse.xd = mouse.x;
                    } else {
                        camera.x = this.exitStartX || 1500; // need this for steady start forward
                        camera.z = this.exitStartZ || 0; // without this we will back up a little
                        camera.targetX = this.exitTargetX || 1200; // these camera.targets put us in the right ...
                        camera.targetZ = this.exitTargetZ || 0; // forward landing position
                        camera.angleTargetX = 0;
                        camera.angleTargetZ = 0;
                        camera.angleH = -1.5;
                    }
                    mouse.xd = mouse.x;
                    console.log("camera", camera);
                })
                .catch((e) => {
                    console.log("still loading..");
                    // silence error.
                });
        }

        // ---- start triangulation ----
        triangulate(this.p0, this.p1, this.p2, level);
        triangulate(this.p0, this.p2, this.p3, level);
        // ---- on mouse over ----
        if (!screen.touch) this.testImageOver(mouse.x, mouse.y);
    };

		
		// ---- on mouse over ----
    ProjectedImage.prototype.testImageOver = function (x, y) {
        const margin = 10; // Increase the target area by 10 pixels
        y > Math.min(this.p0.yp, this.p1.yp) &&
            y < Math.max(this.p2.yp, this.p3.yp) &&
            x > Math.min(this.p0.xp, this.p3.xp) &&
            x < Math.max(this.p1.xp, this.p2.xp) &&
            (imageOver = this);
    };

    /////////////////////////////////////////////////////////////////////////////////////
    /* ==== surface constructor ==== */
    var Surface = function (p) {
        // ---- properties ----
        for (var i in p) this[i] = p[i];
        if (!this.shadingLight) this.shadingLight = scene.shadingLight;
        this.alpha =
            typeof this.fillColor.alpha === "undefined" ? 1 : this.fillColor.alpha;
        this.nP = p.x.length;
        if (this.nP < 3 || this.nP > 4) alert("ERROR: triangles or rectangles only");
        // ---- tri/quad points ----
        this.p0 = addPoint(p.x[0], p.y[0], p.z[0]);
        this.p1 = addPoint(p.x[1], p.y[1], p.z[1]);
        this.p2 = addPoint(p.x[2], p.y[2], p.z[2]);
        if (this.nP == 4) this.p3 = addPoint(p.x[3], p.y[3], p.z[3]);
        // ---- normal vector for flat shading ----
        this.normalX =
            (this.p1.y - this.p0.y) * (this.p2.z - this.p0.z) -
            (this.p1.z - this.p0.z) * (this.p2.y - this.p0.y);
        this.normalY =
            (this.p1.z - this.p0.z) * (this.p2.x - this.p0.x) -
            (this.p1.x - this.p0.x) * (this.p2.z - this.p0.z);
        this.normalZ =
            (this.p1.x - this.p0.x) * (this.p2.y - this.p0.y) -
            (this.p1.y - this.p0.y) * (this.p2.x - this.p0.x);
        this.normalLength = Math.sqrt(
            this.normalX * this.normalX +
            this.normalY * this.normalY +
            this.normalZ * this.normalZ
        );
        // ---- create attached image ----
        if (this.image) {
            this.preImage = new ProjectedImage(this, this.image);
            this.image = false;
        }
        // ---- create custom function ----
        this.createFunction();
        nFaces++;
    };

    /* ==== draw shapes ==== */
    Surface.prototype.draw = function () {
        // ---- shape ----
        ctx.beginPath();
        ctx.moveTo(this.p0.xp - 0.5, this.p0.yp);
        ctx.lineTo(this.p1.xp + 0.5, this.p1.yp);
        ctx.lineTo(this.p2.xp + 0.5, this.p2.yp);
        if (this.p3) ctx.lineTo(this.p3.xp - 0.5, this.p3.yp);
        if (this.alpha !== 0) {
            // ---- fill shape ----
            ctx.fillStyle =
                "rgba(" +
                Math.round(this.fillColor.r * this.light) +
                "," +
                Math.round(this.fillColor.g * this.light) +
                "," +
                Math.round(this.fillColor.b * this.light) +
                "," +
                this.alpha +
                ")";
            ctx.fill();
        }
        // ---- draw image ----
        this.image && this.image.draw();
    };

    /* ==== z buffering, flat shading ==== */
    Surface.prototype.compute = function () {
        // ---- average z-index ----
        this.zIndex =
            (this.p0.zp + this.p1.zp + this.p2.zp + (this.p3 ? this.p3.zp : 0)) /
            this.nP;
        if (this.zIndex > -200) {
            // ---- back face culling ----
            if (
                this.alwaysVisible ||
                ((this.p1.yp - this.p0.yp) / (this.p1.xp - this.p0.xp) <
                    (this.p2.yp - this.p0.yp) / (this.p2.xp - this.p0.xp)) ^
                (this.p0.xp < this.p1.xp == this.p0.xp > this.p2.xp)
            ) {
                // ---- visible face ----
                this.visible = true;
                this.zIndex += this.zIndexOffset || 0;
                // ---- load image ----
                this.preImage && this.preImage.loading();
                // ---- run custom function ----
                this.run && this.run();
                // ---- flat shading ----
                this.light = this.noShading
                    ? 1
                    : scene.ambientLight +
                    (Math.abs(this.normalZ * camera.cosh - this.normalX * camera.sinh) *
                        this.shadingLight) /
                    (camera.normalLength * this.normalLength);
            } else this.visible = false;
        } else this.visible = false;
    };

    /* ==== sprite constructor ==== */
    var Sprite = function (p) {
        for (var i in p) this[i] = p[i];
        this.pc = addPoint(p.x, p.y, p.z);
        // ---- create canvas image ----
        this.srcImg = new Image();
        this.srcImg.src = scene.imagesPath + p.src;
        this.createFunction();
        nFaces++;
    };

    /* ==== draw sprite ==== */
    Sprite.prototype.draw = function () {
        this.run && this.run();
        var w = this.w * this.pc.scale;
        var h = this.h * this.pc.scale;
        ctx.drawImage(this.srcImg, this.pc.xp - w * 0.5, this.pc.yp - h * 0.5, w, h);
    };

    /* ==== z buffering, loading sprite ==== */
    Sprite.prototype.compute = function () {
        if (this.isLoaded) {
            // ---- z-index ----
            if (this.pc.zp > -200) {
                this.zIndex = (this.zIndexOffset || 0) + this.pc.zp;
                this.visible = true;
            } else this.visible = false;
        } else {
            if (this.srcImg.complete) {
                // ---- load image ----
                this.isLoaded = true;
                this.w = this.srcImg.width * this.zoom;
                this.h = this.srcImg.height * this.zoom;
            }
        }
    };

    /* ==== create custom objects function ==== */
    Sprite.prototype.createFunction = Surface.prototype.createFunction = function () {
        if (this.code) {
            if (this.code.init) {
                // ---- compile and execute init() function ----
                this.init = new Function(this.code.init);
                this.init();
            }
            // ---- compile run() function ----
            if (this.code.run) this.run = new Function(this.code.run);
        }
    };

    ////////////////////////////////////////////////////////////////////////////

    /* ===== copy JS object ==== */
    var cloneObject = function (obj) {
        if (typeof obj != "object" || obj == null) return obj;
        var newObj = obj.constructor();
        for (var i in obj) newObj[i] = cloneObject(obj[i]);
        return newObj;
    };

    /* ==== loading geometry file ==== */
    var loadGeometry = function (url) {
        var ajax = new XMLHttpRequest();
        ajax.open("GET", url + "?nocache=" + Math.random(), false);
        ajax.send("");
        return JSON.parse(ajax.responseText);
    };

    /* ==== screen dimensions ==== */
    var resize = function () {
        if (screen) {
            screen.md = (screen.width / Math.PI) * 0.5;
            screen.mw = screen.width / 2;
            screen.mh = screen.height / 2;
            mouse.y = screen.mh;
        }
    };

    // ---- on click -----
    var click = function () {
        for (var i = 0, p; (p = faces[i++]);) {
            if (p.visible && p.image) {
                p.image.testImageOver(screen.mouseX, screen.mouseY);
            }
        }
        imageOver && imageOver.select();
        mouse.y = screen.mh;
    };

    // ---- on move / touch ----
    var pointer = function () {
        if (screen.touch) {
            mouse.x = -(screen.dragX + screen.width) * 0.5;
            mouse.y = screen.dragY;
        } else {
            mouse.x = screen.mouseX;
            mouse.y = screen.mouseY;
        }
    };

    /* ==== init geometry ==== */
    var initGeometryFromData = function (data) {
        nPoints = 0;
        nFaces = 0;
        points = [];
        faces = [];
        scene = data.params;
        // ---- create surfaces ----
        var i = 0, p;
        while ((p = data.geometry[i++])) {
            // ---- push object geometry ----
            if (p.type == "poly") faces.push(new Surface(p));
            else if (p.type == "sprite") faces.push(new Sprite(p));
            else if (p.type == "object") {
                // ---- object reference ----
                var o = data.objects[p.ref];
                for (var j = 0; j < o.length; j++) {
                    var c = cloneObject(o[j]);
                    for (var k in p) if (!c[k]) c[k] = p[k];
                    for (var k = 0; k < c.x.length; k++) {
                        c.x[k] += p.x;
                        c.y[k] += p.y;
                        c.z[k] += p.z;
                    }
                    // ---- push object geometry ----
                    faces.push(new Surface(c));
                }
            }
        }

        return Promise.resolve();
    };

    /* ==== init geometry ==== */
    var initGeometry = function (file) {
        if (loaderFunction) {
        return loaderFunction(file).then(initGeometryFromData);        }

        const data = loadGeometry(file);
        return initGeometryFromData(data);
    };

    /* ==== init script ==== */
    var init = function (file, loader) {
        loaderFunction = loader || undefined;

        screen = new ge1doot.screen.InitEvents({
            container: "screen",
            canvas: "canvas",
            click: click,
            move: pointer,
            resize: resize,
        });
        ctx = screen.ctx;
        // ---- events ----
        screen.resize();
        document.getElementById("dynamic_info").innerHTML = "Click on pictures to move around. Click on open doors to change rooms.";
        // ---- init geometry ----
        mouse.x = screen.width / 2;
        camera.x = 0;
        camera.z = 0;
        camera.targetX = 0;
        camera.targetZ = 0;

        initGeometry(file).then(() => {
            // ---- starting position ----
            mouse.x = screen.width / 2;
            camera.x = scene.startX || 0;
            camera.z = scene.startZ || 0;
            camera.targetX = scene.targetX || 0;
            camera.targetZ = scene.targetZ || 0;
            // ---- start engine ----
            run();
        });
    };

    ////////////////////////////////////////////////////////////////////////////

    return {
        // ---- public functions ----
        init: init,
        imageOver: function() { return imageOver; } // Expose imageOver for external access
    };
})();