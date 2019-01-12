# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Modified for MSTI 510

# Ying Zheng modified this on Dec 6, 2018
# Assignment 2: SAMSUNG - SMART HOME ASSISTANT ROBOT
# Open index.html to see and hear from robot
# The robot uses image processing for the following:
# 1) greet you at the door,
# 2) determine if you are from the household,
# 3) determine that an unlocking "key" image is being shown at the door
#    (the "key" image will only open the door for member of the household)
#
# Robot will also gaze at you
#
# Please pip install the following imports before you run.
# Add the key image and provided photos in the same folder of this file.
# When trying to detect the key:
# 1. Face and key should all present in front of camera.
# 2. Make sure the key is closer to camera than face does.

from flask import Flask, request, jsonify
import cv2
import numpy
from PIL import Image
import io
import re
import base64
import face_recognition

app = Flask(__name__)

# load my photo
owner = face_recognition.load_image_file("Ying.jpg")
owner_encoding = face_recognition.face_encodings(owner)[0]
gakki = face_recognition.load_image_file("gakki.jpg")
gakki_encoding = face_recognition.face_encodings(gakki)[0]
emma = face_recognition.load_image_file("EmmaWatson.jpg")
emma_encoding = face_recognition.face_encodings(emma)[0]
known_face_encodings = [owner_encoding, gakki_encoding, emma_encoding]
known_face_names = ["Ying", "Gakki", "Emma Watson"]

# load template for key
template = cv2.imread('Key.jpg')
(tH, tW) = template.shape[:2]
gray_template = cv2.cvtColor(template, cv2.COLOR_RGB2GRAY)
key = cv2.Canny(gray_template, 50, 200)
horizontal_flip_key = cv2.flip(key, 1)  # flip template for better comparison result

def url_to_image(url):
  imgstr = re.search(r'base64,(.*)', url).group(1)
  image_bytes = io.BytesIO(base64.b64decode(imgstr))
  im = Image.open(image_bytes)
  image = numpy.array(im)
  return image


@app.route('/', methods=['POST'])
def detect_faces():
    print(str(request.data)[0:100])
    image = url_to_image(str(request.data))
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    resize_img = cv2.resize(rgb, (0, 0), fx=0.2, fy=0.2)
    results = []

    # find face from video
    faces = face_recognition.face_locations(resize_img)
    face_encodings = face_recognition.face_encodings(resize_img, faces)

    face_names = []
    for face_encoding in face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.45)
        name = "Unknown"

        if True in matches:
            first_match_index = matches.index(True)
            name = known_face_names[first_match_index]

        face_names.append(name)

    for (top, right, bottom, left), name in zip(faces, face_names):
        # Scale back up face locations since the frame was scaled to 1/5 size
        top *= 5
        right *= 5
        bottom *= 5
        left *= 5
        w = right - left
        h = bottom - top
        results.append({'x': int(left), 'y': int(top), 'w': int(w), 'h': int(h), "name": name})
    print("Found " + str(len(results)) + " faces.")
    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


@app.route('/key', methods=['POST'])
def detect_key():
    print(str(request.data)[0:100])
    image = url_to_image(str(request.data))
    results = {}
    gray_img = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    found = None

    # resize image to find match
    for scale in numpy.linspace(0.2, 1.0, 20)[::-1]:
        # resize the image according to the scale
        resize_img = cv2.resize(gray_img, (0, 0), fx=scale, fy=scale)

        # if the resized image is smaller than the template, then break from the loop
        if resize_img.shape[0] < tH or resize_img.shape[1] < tW:
            break

        # detect edges in the resized, grayscale image and apply template
        # matching to find the template in the image
        canny_img = cv2.Canny(resize_img, 50, 200)
        result = cv2.matchTemplate(canny_img, horizontal_flip_key, cv2.TM_CCOEFF)
        (_, maxVal, _, maxLoc) = cv2.minMaxLoc(result)
        if found is None or maxVal > found[0]:
            found = (maxVal, maxLoc, scale)

    (maxVal, maxLoc, scale) = found
    # find locations in original image
    (x, y) = (int(maxLoc[0] // scale), int(maxLoc[1] // scale))
    w = tW // scale
    h = tH // scale
    results = {'val': int(maxVal), 'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)}
    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True, threaded=True)
