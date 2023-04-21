// if user is on mobile resolution
if (window.matchMedia("(max-width: 940px)").matches) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var picture_canvas = document.getElementById("picture_canvas");
    picture_canvas.width = width;
    picture_canvas.height = height;
} else {
    var width = 940;
    var height = 640;
}

// color choices used for bounding box rectangles being drawn around API predictions on images
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

// my API dataset models which can be found at 
// https://app.roboflow.com/ass3/chess-63bga/2
// https://app.roboflow.com/ass3/hard-hat-sample-rxxzq/1
var available_models = {
    "chess-63bga": {
        "name": "Chess Board Sample",
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
            "f9a.jpg",
            "a13.jpg",
            "b14.jpg",
            "c15.jpg",
            "d16.jpg",
            "e17.jpg",
            "f18.jpg"
        ],
        "model": null
    },
    "hard-hat-sample-rxxzq": {
        "name": "Hard Hat Sample",
        "version": 2,
        "confidence": 35,
        "imageGrid": [
            "000080_jpg.rf.UDJa4frTULr5kFQkLYoR.jpg",
            "000029_jpg.rf.ynhtJgkwuGGyQoHyS735.jpg",
            "000059_jpg.rf.vARPP8qgYaj8kE8BEpcx.jpg",
            "000028_jpg.rf.5mB4KwNdl40IaJj7jIZF.jpg",
            "000035_jpg.rf.Mldw7ZiTXavHvJPAAr15.jpg",
            "000084_jpg.rf.6bXneea3O5xbU2vUZ8Rt.jpg",
            "000038_jpg.rf.Zm5JuLNxOCM08kbk5ysZ.jpg",
            "000039_jpg.rf.TL91Q3MpJjh7aLsiSgtk.jpg",
            "000067_jpg.rf.COOQa83KWWvg1ZfV96cg.jpg",
            "000079_jpg.rf.HhzdbdkdHdtCzSmy31aR.jpg",
            "000083_jpg.rf.gXUpFQag3YxxGdxruFB2.jpg",
            "000087_jpg.rf.M6D3pcV0QQ13srlYBwSg.jpg",
            "000073_jpg.rf.esZ2aOkiSDwd1zGhLSiT.jpg",
            "000098_jpg.rf.oIxMDOqiZ6Aq0tJ1CGx5.jpg",
            "000001_jpg.rf.8FkaVqzb2n3wO25SCLyN.jpg",
            "000094_jpg.rf.Cl6YSkQVDOwmfAFcPTXs.jpg",
            "000008_jpg.rf.WWkQNjS8JNPEymzN80T7.jpg",
            "000026_jpg.rf.nkEAM6JqsILw0can2LEL.jpg"
        ],
        "model": null
    }
};

// populate model select 
var model_select = document.getElementById("model-select");

// create items to populate dropdopwn menu
for (var item in available_models) {
    var option = document.createElement("option");
    option.text = available_models[item]["name"];
    option.value = item;
    model_select.add(option);
}

// st current model variables and set constant API information variables
var current_model_name = "chess-63bga";
var current_model_version = 2;
const API_KEY = "rf_CLCPOz364QZrkPGuARIi5T6NTXp2";
const DETECT_API_KEY = "ZDSAnfAdcjKqhV2650zg";
var no_detection_count = 0;
var canvas_painted = false;
var all_predictions = [];

// set model to null
var model = null;

// async function to call the api request utilizing my API information
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

// async fnction to ge tth model from Roboflow Inference using API key, model and version
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

// bounding box colors varibale
var bounding_box_colors = {};

// function used to switch model using the model select option
// user can toggle between chess and hard hat datasets for inference
function switchModel() {
    current_model_name = document.getElementById("model-select").value;
    current_model_version = available_models[current_model_name]["version"];

    if (current_model_name == "chess-63bga") {
        document.getElementById("picture_canvas").style.display = "none";
        document.getElementById("picture").style.display = "none";
        // hide command tray
        document.getElementById("prechosen_images_parent").style.display = "none";
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

    // set prechosen images children variable
    var prechosen_images = prechosen_images.children;

    // iterate through prechosen images 
    for (var i = 0; i < prechosen_images.length; i++) {
        prechosen_images[i].src = available_models[current_model_name]["imageGrid"][i];
    }

    model = getModel();
}

// apply switchModel to select
document.getElementById("model-select").addEventListener("change", switchModel);

// set image state function and apply context to canvas
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

// draw bounding box function and label predicitons shown within the canvas
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

    // if box is partially outside 940x640, clip it
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

// get coordinates of images function
function getCoordinates(img) {
    var dx = 0;
    var dy = 0;
    var dWidth = 940;
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

// get base 64 images function
function getBase64Image(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var context = canvas.getContext("2d");
    context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    var dataURL = canvas.toDataURL("image/jpeg");
    return dataURL;
}

// image for inference function
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

//
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