from flask import Flask, render_template, request, url_for, Response
from flask_restful import Api, Resource, reqparse
import pytesseract
import cv2
from PIL import Image
import os, werkzeug
from math import floor
import base64
import numpy as np
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
import nltk
from gingerit.gingerit import GingerIt

nltk.download('punkt')

# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
pytesseract.pytesseract.tesseract_cmd = '/app/.apt/usr/bin/tesseract'

REDUCTION_COEFF = 0.9
QUALITY = 85

app = Flask(__name__)
api = Api(app)
parser = reqparse.RequestParser()
parser.add_argument('file', type=werkzeug.datastructures.FileStorage, location='files')


# Use this function for preprocessing when the image doesn't only contain text
def preProcessWithImage(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gaussian = cv2.GaussianBlur(gray, (3, 3), 0)
    ret, thresh = cv2.threshold(gaussian, 0, 255, cv2.THRESH_OTSU)

    erode = cv2.erode(thresh, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)))
    dilate = cv2.dilate(erode, cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)))
    return dilate


def cleanText(preProcessedImage):
    text = pytesseract.image_to_string(preProcessedImage)
    text = text.replace(' ', '<>')
    text = text.replace('><', '')
    text = text.replace('<>', ' ')
    text = text.replace('\n ', '\n')
    text = text.replace('\n', '<>')
    text = text.replace('><', '')
    text = text.replace('<>', '\n')
    text = text.replace('\n-', '\n')
    text = text.replace('-\n', '')
    finalString = ''
    parser = GingerIt()
    for i in text.split('.'):
        finalString = finalString + parser.parse(i)['result'] + '.'
    return finalString


def summarize(text, typeOfSummary, noOfSentences):
    finalSummary = ''

    parser = PlaintextParser.from_string(text, Tokenizer('english'))

    if typeOfSummary == 'lexRank':
        from sumy.summarizers.lex_rank import LexRankSummarizer

        summarizer = LexRankSummarizer()
        summary = summarizer(parser.document, noOfSentences)

    elif typeOfSummary == 'luhn':
        from sumy.summarizers.luhn import LuhnSummarizer

        summarizer = LuhnSummarizer()
        summary = summarizer(parser.document, noOfSentences)

    elif typeOfSummary == 'lsa':
        from sumy.summarizers.lsa import LsaSummarizer

        summarizer = LsaSummarizer()
        summary = summarizer(parser.document, noOfSentences)

    if typeOfSummary in ['lexRank', 'luhn', 'lsa']:
        for i in summary:
            finalSummary = finalSummary + str(i) + '\n'

    return finalSummary


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/about/')
def about():
    return render_template('about.html')


@app.route('/upload', methods=['GET', 'POST'])
def upload():
    try:
        imagefile = request.files.get('imagefile', '')
        # create byte stream from uploaded file
        file = request.files['imagefile'].read()  ## byte file
        img = Image.open(imagefile)
        openCVImage = img.copy()
        openCVImage = np.array(openCVImage)
        img1 = img.convert('LA')
        print("Before reducing", img1.size)
        imgsize = len(file) >> 20
        if imgsize > 2:
            x, y = img1.size
            x *= REDUCTION_COEFF
            y *= REDUCTION_COEFF
            img1 = img1.resize((floor(x), floor(y)), Image.BICUBIC)
            print("Img reduced", img1.size)
        ext = "jpeg"
        if "." in imagefile.filename:
            ext = imagefile.filename.rsplit(".", 1)[1]
        imagePreProcessed = preProcessWithImage(openCVImage)
        convertedText = cleanText(imagePreProcessed)
        text = summarize(convertedText, 'lexRank', 5)
        # text = text
        # text = pytesseract.image_to_string(imagePreProcessed)
        # Base64 encoding the uploaded image
        img_base64 = base64.b64encode(file)
        img_base64_str = str(img_base64)
        # final base64 encoded string
        img_base64_str = "data:image/" + ext + ";base64," + img_base64_str.split('\'', 1)[1][0:-1]
        f = open("sample.txt", "a")
        f.truncate(0)
        f.write(text)
        f.close()
        return render_template('result.html', var=text, img=img_base64_str)
    except Exception as e:
        print(e)
        return render_template('error.html')


@app.route("/gettext")
def gettext():
    with open("sample.txt") as fp:
        src = fp.read()
    return Response(
        src,
        mimetype="text/csv",
        headers={"Content-disposition":
                     "attachment; filename=sample.txt"})


# ----- API -----
class UploadAPI(Resource):
    def get(self):
        print("check passed")
        return {"message": "API For TextExtractor2.0"}, 200

    def post(self):
        data = parser.parse_args()
        if data['file'] == "":
            return {'message': 'No file found'}, 400

        photo = data['file']
        if photo:
            photo.save(os.path.join("./static/images/", photo.filename))
            img = Image.open(photo)
            img1 = img.convert("LA")
            text = pytesseract.image_to_string(img1)
            print("check 1 passed")
            os.remove(os.path.join("./static/images/", photo.filename))
            return {"message": text}, 200
        else:
            return {'message': 'Something went wrong'}, 500


api.add_resource(UploadAPI, "/api/v1/")

# End Of API Endpoint

if __name__ == "__main__":
    app.run()
