var imgString = null;
var faces = [];
var key = {};

function detectFace() {
  	// Use the following if you are testing locally
    var serviceURL = "http://127.0.0.1:8080/";
  	var request = {image: imgString};
  	if (imgString != null)
	  	ajaxRequest("POST", serviceURL,
  			handleFaceResponse, JSON.stringify(request));
	else
		console.log("An image has not yet been captured.");
}

function detectKey() {
  	// Use the following if you are testing locally

    // var serviceURL = "https://techin510-2018.appspot.com/";
    var serviceURL = "http://127.0.0.1:8080/key";
  	var request = {image: imgString};
  	if (imgString != null)
	  	ajaxRequest("POST", serviceURL,
  			handleKeyResponse, JSON.stringify(request));
	else
		console.log("An image has not yet been captured.");
}

function handleFaceResponse() {
  if (successfulRequest(this)) {
        faces = JSON.parse(this.responseText);
  }
}

function handleKeyResponse() {
  if (successfulRequest(this)) {
        key = JSON.parse(this.responseText);
//        console.log(key);
  }
}

/*Helper function: sends an XMLHTTP request*/
function ajaxRequest(method, url, handlerFunction, content) {
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url);
  xhttp.onreadystatechange = handlerFunction;
  xhttp.send(content);
}

/*Helper function: checks if the response to the request is ready to process*/
function successfulRequest(request) {
  return request.readyState === 4 && request.status == 200;
}

/* This function checks and sets up the camera */
function startVideo() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(handleUserMediaSuccess);
  }
}



/* This function initiates the camera video */
function handleUserMediaSuccess(stream) {
  var video = document.getElementById("video");
  video.src = window.URL.createObjectURL(stream);
  video.play();

  /* We will capture an image twice every second */
  window.setInterval(captureImageFromVideo, 500);
}

var currentName = "";
var recognition = true;

/* This function captures the video */
function captureImageFromVideo() {
  var video = document.getElementById("video");
  var canvas = document.getElementById("mainCanvas");
  var context = canvas.getContext("2d");
  var textDiv = document.getElementById("speech");

  //draw image
  canvas.setAttribute("width", video.width);
  canvas.setAttribute("height", video.height);
  context.drawImage(video, 0, 0, video.width, video.height);

  //set context attribute
  context.font = "30px Arial";
  context.lineWidth = 3;
  imgString = canvas.toDataURL();

  // if key is presented
  foundKey = (key.val > 7200000);

  // things to say
  var name = "";
  var greetings = "";

  // if a face is detected
  if (faces.length > 0) {
  	for (var i=0; i<faces.length; i++) {
  	    name = faces[i].name;
  	    // green rectangle for known people
  	    if (name.localeCompare("Unknown") != 0) {
          context.strokeStyle = "#0F0";
          context.fillStyle= "#0F0";
          // only ask key from known people
          console.log("key", key);
          if (recognition) {
            greetings = "Hi, " + name + ". Do you have the key?";
          }
          detectKey();
          if (foundKey) {
            context.rect(key.x,key.y,key.w,key.h);
            context.stroke();
            //context.fillText(key.val, key.x, key.y + 55);
            context.fillText("Key", key.x + 30, key.y + 35);
            greetings = "Welcome home," + name + ".";
            if (recognition) {
              speak(greetings, 'en-US');
              recognition = false;
            }
          }
        // red rectangle for unknown people
        } else {
          greetings = "Hi, there. I'll let the owner know you're here."
          context.strokeStyle = "#FF0000";
          context.fillStyle= "#FF0000";
        }
        textDiv.innerHTML = greetings;

        // draw a rectangle around face
        x = faces[i].x;
        y = faces[i].y;
  		context.rect(x, y,faces[i].w,faces[i].h);
		context.stroke();
		context.fillText(name, x, y - 15);
		movePupil(x, y);
	}
  }
  if (name.localeCompare(currentName) != 0) {
    speak(greetings, 'en-US');
    currentName = name;
  }
  detectFace();
}

// add gaze behavior
function movePupil(x, y) {
  // All below are for face animation
  var faceBound = document.getElementById("face").getBoundingClientRect();
  var eyeBound = document.getElementById("leftEye").getBoundingClientRect();

  var left = document.getElementById("leftPupil");
  var right = document.getElementById("rightPupil");
  var ratio = 0.04
  x = 640 - x;

  if (inBound(x, faceBound.x + faceBound.width*3)) {
    left.setAttribute("cx", 88 + ratio * x);
    right.setAttribute("cx", 191 + ratio * x);
  }

  if (inBound(y, faceBound.y + faceBound.height*3)) {
    left.setAttribute("cy", 50 + ratio * y);
    right.setAttribute("cy", 50 + ratio * y);
  }
}

function inBound(value, max){
  return value < max;
}

blinking();

// add one blink
function blink() {
  setTimeout(function() {
    $("#leftEye").hide();
    $("#rightEye").hide();
    $("#leftPupil").hide();
    $("#rightPupil").hide();
  }, 100);
  setTimeout(function() {
    $("#leftEye").show();
    $("#rightEye").show();
    $("#leftPupil").show();
    $("#rightPupil").show();
  }, 300);
}

// add blinks
function blinking() {
  var loop = function() {
    blink();
    var random = Math.round(Math.random() * (5000)) + 1000;
    setTimeout(loop, random);
  }
  loop();
}

/*Function that makes the browser speak a text in a given language*/
function speak(text, lang) {
  /*Check that your browser supports test to speech*/
  if ('speechSynthesis' in window) {
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log("Your browser supports " + voices.length + " voices");
      // console.log(voices);
      msg.voice = voices.filter(function(voice) { return voice.lang == lang; })[1];
    }
    msg.voiceURI = 'Google US English';
    msg.volume = 1; // 0 to 1
    msg.rate = 1; // 0.1 to 10
    msg.pitch = 1.5; //0 to 2
    msg.text = text;
    msg.lang = lang;
    msg.onend = function(e) {
      console.log('Finished in ' + e.elapsedTime + ' milliseconds.');
    };
    speechSynthesis.speak(msg);
  }
}

// speech recognition
var grammar =
  "#JSGF V1.0; grammar emar; public <greeting> = hello | hi; <person> = maya | alisa;";
var recognition = new window.webkitSpeechRecognition();
var speechRecognitionList = new window.webkitSpeechGrammarList();
speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
recognition.continuous = true;
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function startRecognition() {
  recognition.start();
  console.log("start recognition");
};

recognition.onresult = processSpeech;

function processSpeech(event) {
  var inputSpeech = event.results[0][0].transcript;
  input = {"userInput": inputSpeech};
  db.update(input);
  recognition.stop();
}

recognition.onend = recognitionEnded;

function recognitionEnded() {
  console.log("onend happened");
  recognition.stop();
}

