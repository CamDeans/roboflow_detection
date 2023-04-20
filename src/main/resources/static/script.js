// if user is on mobile resolution
if (window.matchMedia("(max-width: 500px)").matches) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var picture_canvas = document.getElementById("picture_canvas");
    picture_canvas.width = width;
    picture_canvas.height = height;
} else {
    var width = 640;
    var height = 640;
}

var main_stream = null;

var color_choices = [
    "#C7FC00",
    "#FF00FF",
    "#8622FF",
    "#FE0056",
    "#00FFCE",
    "#FF8000",
    "#00B7EB",
    "#FFFF00",
    "#0E7AFE",
    "#FFABAB",
    "#0000FF",
    "#CCCCCC",
];

var available_models = {
    "chess-63bga": {
        "name": "CHESS 63BGA",
        "version": 2,
        "confidence": 35,
        "imageGrid": [
            "0af.jpg",
            "1be.jpg",
            "5c1.jpg",
            "55b.jpg",
            "a97.jpg",
            "bc5.jpg",
            "c78.jpg",
            "ce5.jpg",
            "d9a.jpg",
            "e40.jpg",
            "ec5.jpg",
            "f9a.jpg"
        ],
        "model": null
    }
};

// populate model select
var model_select = document.getElementById("model-select");

for (var item in available_models) {
    var option = document.createElement("option");
    option.text = available_models[item]["name"];
    option.value = item;
    model_select.add(option);
}

var current_model_name = "chess-63bga";
var current_model_version = 2;
const API_KEY = "rf_CLCPOz364QZrkPGuARIi5T6NTXp2";
const DETECT_API_KEY = "ZDSAnfAdcjKqhV2650zg";
var no_detection_count = 0;
var canvas_painted = false;
var all_predictions = [];

var model = null;

async function apiRequest (image) {
    var version = available_models[current_model_name]["version"];
    var name = current_model_name;
    var confidence = document.getElementById("confidence");

    var url = "https://detect.roboflow.com/" + name + "/" + version + "?api_key=" + DETECT_API_KEY + "&confidence=" + confidence.value;
    
    // no cors
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: image,
        redirect: "follow",
    }).then((response) => response.json()
    ).then(resJson => { return resJson["predictions"] });
}

async function getModel() {
    var model = await roboflow
    .auth({
        publishable_key: API_KEY,
    })
    .load({
        model: current_model_name,
        version: current_model_version,
    });

    model.configure({
        threshold: available_models[current_model_name]["confidence"],
        max_objects: 50
    });

    return model;
}

var bounding_box_colors = {};

function switchModel() {
    current_model_name = document.getElementById("model-select").value;
    current_model_version = available_models[current_model_name]["version"];

    if (current_model_name == "chess-63bga") {
        document.getElementById("picture_canvas").style.display = "none";
        document.getElementById("picture").style.display = "none";
        // hide command tray
        // document.getElementById("prechosen_images_parent").style.display = "none";
    } else {
        document.getElementById("picture_canvas").style.display = "none";
        document.getElementById("picture").style.display = "block";
        document
        .getElementById("picture")
        .addEventListener("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        document
        .getElementById("picture")
        .addEventListener("drop", processDrop);
    }

    // IF MODEL IS chess-63bga, change 

    // change prechosen_images_parent srcs
    var prechosen_images = document.getElementById(
        "prechosen_images"
    );

    var prechosen_images = prechosen_images.children;

    for (var i = 0; i < prechosen_images.length; i++) {
        prechosen_images[i].src = available_models[current_model_name]["imageGrid"][i];
    }

    model = getModel();
}

// apply switchModel to select
document.getElementById("model-select").addEventListener("change", switchModel);

function setImageState(src, canvas = "picture_canvas") {
    var canvas = document.getElementById(canvas);
    var context = canvas.getContext("2d");
    var img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.style.width = width + "px";
    img.style.height = height + "px";
    img.height = height;
    img.width = width;
    img.onload = function () {
    context.drawImage(img, 0, 0, width, height, 0, 0, width, height);
    };
}

function drawBoundingBoxes(predictions, canvas, context, scalingRatio, sx, sy, fromDetectAPI = false) {
    if (predictions.length > 0) {
      all_predictions = predictions;
    }

    if (no_detection_count > 2) {
      all_predictions = predictions;
      no_detection_count = 0;
    }

    if (predictions.length == 0) {
      no_detection_count += 1;
    }

    for (var i = 0; i < predictions.length; i++) {
    var confidence = predictions[i].confidence;
    context.scale(1, 1);

    if (predictions[i].class in bounding_box_colors) {
        context.strokeStyle = bounding_box_colors[predictions[i].class];
    } else {
        // random color
        var color =
        color_choices[Math.floor(Math.random() * color_choices.length)];
        context.strokeStyle = color;
        // remove color from choices
        color_choices.splice(color_choices.indexOf(color), 1);

        bounding_box_colors[predictions[i].class] = color;
    }

    var prediction = predictions[i];
    var x = prediction.bbox.x - prediction.bbox.width / 2;
    var y = prediction.bbox.y - prediction.bbox.height / 2;
    var width = prediction.bbox.width;
    var height = prediction.bbox.height;

    if (!fromDetectAPI) {
        x -= sx;
        y -= sy;

        x *= scalingRatio;
        y *= scalingRatio;
        width *= scalingRatio;
        height *= scalingRatio;
    }

    // if box is partially outside 640x640, clip it
    if (x < 0) {
        width += x;
        x = 0;
    }

    if (y < 0) {
        height += y;
        y = 0;
    }

    // if first prediction, double label size


    context.rect(x, y, width, width);

    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fill();

    context.fillStyle = context.strokeStyle;
    context.lineWidth = "4";
    context.strokeRect(x, y, width, height);
    // put colored background on text
    var text = context.measureText(
        prediction.class + " " + Math.round(confidence * 100) + "%"
    );
    
    if (i == 0) {
        text.width *= 2;
    }

    // set x y fill text to be within canvas x y, even if x is outside
    if (y < 0) {
        y = -40;
    }
    if (y < 20) {
        y = 30
    }

    // make sure label doesn't leave canvas

    context.fillStyle = context.strokeStyle;
    context.fillRect(x - 2, y - 30, text.width + 4, 30);
    // use monospace font
    context.font = "15px monospace";
    // use black text
    context.fillStyle = "black";

    context.fillText(
        prediction.class + " " + Math.round(confidence * 100) + "%",
        x,
        y - 10
    );
    }
}

function getCoordinates(img) {
    var dx = 0;
    var dy = 0;
    var dWidth = 640;
    var dHeight = 640;

    var sy;
    var sx;
    var sWidth = 0;
    var sHeight = 0;

    var imageWidth = img.width;
    var imageHeight = img.height;

    const canvasRatio = dWidth / dHeight;
    const imageRatio = imageWidth / imageHeight;

    // scenario 1 - image is more vertical than canvas
    if (canvasRatio >= imageRatio) {
        var sx = 0;
        var sWidth = imageWidth;
        var sHeight = sWidth / canvasRatio;
        var sy = (imageHeight - sHeight) / 2;
    } else {
    // scenario 2 - image is more horizontal than canvas
        var sy = 0;
        var sHeight = imageHeight;
        var sWidth = sHeight * canvasRatio;
        var sx = (imageWidth - sWidth) / 2;
    }

    var scalingRatio = dWidth / sWidth;

    if (scalingRatio == Infinity) {
        scalingRatio = 1;
    }

    return [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, scalingRatio];
}

function getBase64Image(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var context = canvas.getContext("2d");
    context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    var dataURL = canvas.toDataURL("image/jpeg");
    return dataURL;
}

function imageInference(e) {
    // replace canvas with image
    document.getElementById("picture_canvas").style.display = "block";

    var canvas = document.getElementById("picture_canvas");
    var context = canvas.getContext("2d");
    var img = new Image();
    img.src = e.src;
    img.crossOrigin = "anonymous";

    context.clearRect(0, 0, canvas.width, canvas.height);

    img.onload = function () {
        setImageState(
            "picture_canvas"
        );
    var [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, scalingRatio] =
        getCoordinates(img);

    var base64 = getBase64Image(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    apiRequest(base64).then(function (predictions) {
        context.beginPath();
        // draw image to canvas
        context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        var predictions = predictions.map(function (prediction) {
            return {
                bbox: { x: prediction.x, y: prediction.y, width: prediction.width, height: prediction.height},
                class: prediction.class,
                confidence: prediction.confidence,
        }});

        drawBoundingBoxes(predictions, canvas, context, scalingRatio, sx, sy, true);
    });
    };
}

function processDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    // hide #picture
    changeElementState(["picture", "picture_canvas"], "none");
    document.getElementById("picture_canvas").style.display = "block";
    // show loading image
    //document.getElementById("loading_picture").style.display = "block";

    // clear canvas if necessary
    if (document.getElementById("picture_canvas").getContext) {
        var canvas = document.getElementById("picture_canvas");
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    var canvas = document.getElementById("picture_canvas");
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    var file = e.dataTransfer.files[0];
    var reader = new FileReader();

    reader.readAsDataURL(file);

    // only allow png, jpeg, jpg
    if (
    file.type == "image/png" ||
    file.type == "image/jpeg" ||
    file.type == "image/jpg"
    ) {
    reader.onload = function (event) {
        var img = new Image();
        img.src = event.target.result;
        img.crossOrigin = "anonymous";
        img.onload = function () {
        var [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, scalingRatio] =
            getCoordinates(img);

        // send to api
        var base64 = getBase64Image(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

        apiRequest(base64).then(function (predictions) {
            //document.getElementById("loading_picture").style.display = "none";
            document.getElementById("picture_canvas").style.display = "block";
            context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            var predictions = predictions.map(function (prediction) {
                return {
                    bbox: { x: prediction.x, y: prediction.y, width: prediction.width, height: prediction.height},
                    class: prediction.class,
                    confidence: prediction.confidence,
            }});
            context.beginPath();
            drawBoundingBoxes(predictions, canvas, context, scalingRatio, sx, sy);
            });
        };
        document
        .getElementById("picture_canvas")
        .addEventListener("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        document
        .getElementById("picture_canvas")
        .addEventListener("drop", processDrop);
    };
    }
}

function changeElementState (elements, state = "none") {
    for (var i = 0; i < elements.length; i++) {
        if (document.getElementById(elements[i])) {
            document.getElementById(elements[i]).style.display = state;
        }
    }
}

// click on image-predict, show image inference
document.getElementById("image-predict").addEventListener("click", function () {
    // show prechosen_images_parent
    var to_hide = ["picture_canvas"];
    changeElementState(to_hide);
    changeElementState(["prechosen_images_parent", "picture"], "block");
    // set event handler on image
    document.getElementById("picture").addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    document.getElementById("picture").addEventListener("drop", processDrop);
});