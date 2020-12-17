(function() {
    var camHeight = 0;
    var camWidth = 500;

    var streaming = false;

    var camInput = null;
    var camCanvas = null;
    var camImg = null;
    var camCapture = null;
    var camCrop = null;
    var camRotRange = null;
    var imgUpload = null;
    var faceCutout = null;

    var imageInput = null;
    var croppingBoard = null;
    var processedOutput = null;

    var startCamera = null;
    var camStop = null;
    var camStopAlt = null;

    var cameraModule = null;

    var formUpload = null;
    var fileToUpload = null;

    function stopCam() {
        cameraModule.classList.contains("hidden") ? undefined : cameraModule.classList.add("hidden");
        camInput.srcObject.getTracks()[0].stop();
        streaming = false;

        loadView(imageInput);
    }

    function loadCam() {
        camInput = document.getElementById("cam-input");
        camCapture = document.getElementById("cam-capture");
        camCanvas = document.getElementById("cam-canvas");
        camCanvasDiv = document.getElementById("cam-canvas-div");
        camRotRange = document.getElementById("cam-rot-range");
        camCrop = document.getElementById("cam-crop");
        camImg = document.getElementById("cam-img");

        imageInput = document.getElementById("image-input");
        croppingBoard = document.getElementById("cropping-board");

        cameraModule = document.getElementById("camera-module");

        formUpload = document.getElementById("formUpload");
        fileToUpload = document.getElementById("fileToUpload");

        cameraModule.classList.remove("hidden");
        camWidth = cameraModule.clientWidth - 32;
        camHeight = cameraModule.clientHeight - 100;

        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment'
                },
            audio: false
        })
        .then(function(stream) {
            camInput.srcObject = stream;
            camInput.play();
        })
        .catch(function(err) {
            console.log("error occurred while playing video stream " + err);
        });

        camInput.addEventListener("canplay", function(ev) {
            if (!streaming) {
                if(camHeight > camWidth) {
                    camHeight = camInput.videoHeight / (camInput.videoWidth / camWidth);
                } else {
                    camWidth = camInput.videoWidth / (camInput.videoHeight / camHeight);
                }

                camInput.setAttribute("width", camWidth);
                camInput.setAttribute("height", camHeight);
                camCanvas.setAttribute("width", camWidth);
                camCanvas.setAttribute("height", camHeight);
                camCanvasDiv.style.width = camWidth;
                camCanvasDiv.style.height = camHeight;

                cameraModule.style.right = "auto";
                cameraModule.style.bottom = "auto";

                streaming = true
            }
        }, false);

        camCapture.addEventListener("click", function(ev) {
            takePicture(camInput);
            ev.preventDefault();
        }, false);

        camRotRange.addEventListener("input", function() {
            camCanvas.cropper.rotateTo(this.value);
        });

        camCrop.addEventListener("click", function() {
            var cropped = camCanvas.cropper.getCroppedCanvas();
            var imgData = cropped.toDataURL("image/jpg");
            camImg.setAttribute("src", imgData);

            processImg(imgData);
        });

        clearPhoto();
    }

    function clearPhoto() {
        var ctx = camCanvas.getContext("2d");
        ctx.fillStyle = "#aaa";
        ctx.fillRect(0, 0, camCanvas.width, camCanvas.height);
    }

    function takePicture(input) {
        if (camCanvas.classList.contains("cropper-hidden")) {
            clearPhoto();
            camCanvas.cropper.destroy();
        }
        var ctx = camCanvas.getContext("2d");
        if (camWidth && camHeight) {
            camCanvas.width = input.width ? input.width : camWidth;
            camCanvas.height = input.height ? input.height : camHeight;
            ctx.drawImage(input, 0, 0, camCanvas.width, camCanvas.height);

            const cropper = new Cropper(camCanvas, {
                viewMode: 2,
                preview: Element,
                dragMode: 'move'
            });
        } else {
            clearPhoto();
        }

        camInput.src = "";
        camInput.srcObject.getTracks()[0].stop();
        loadView(croppingBoard);
    }

    function loadView(view) {
        imageInput.classList.contains("hidden") ? undefined : imageInput.classList.add("hidden");
        croppingBoard.classList.contains("hidden") ? undefined : croppingBoard.classList.add("hidden");

        view.classList.remove("hidden");
    }

    function processImg(imgData) {
        var file;

        function urltoFile(url, filename, mimeType) {
            return (fetch(url)
                .then(function(res) {
                    return res.arrayBuffer();
                })
                .then(function(buf) {
                    return new File([buf], filename, {
                        type: mimeType
                    });
                })
            );
        }

        urltoFile(imgData, "imagefile", imgData.split(";base64")[0].split(":")[1])
            .then(function(file) {
                var formData = new FormData();
                formData.append("imagefile", file);
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function() {
                    if (this.readyState === 4 && this.status === 200) {
                        document.open();
                        document.write(this.response);
                        document.close();
                    }
                };
                xhttp.open("POST", "upload", true);
                xhttp.send(formData);
            });
    }

    window.addEventListener("load", function() {
        startCamera = document.getElementById("start-camera");
        camStop = document.getElementById("cam-stop");
        camStopAlt = document.getElementById("cam-stop-alt");
        startCamera.addEventListener("click", loadCam);
        camStop.addEventListener("click", stopCam);
        camStopAlt.addEventListener("click", stopCam);
    });
})();
