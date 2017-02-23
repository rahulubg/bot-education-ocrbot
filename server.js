var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request_promise = require('request-promise').defaults({ encoding: null });
var request = require('request');
var config = require('./configuration');


// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);

bot.dialog("/", [
    function (session, args, next) { 

        var msg = session.message;
        var extractedUrl = extractUrl(msg);
        var attachment = msg.attachments[0];

        // True if it's an attachment and false if it's an url link
        if (attachment) {

            // Message with attachment, proceed to download it.
            // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
            console.log(attachment);

            var fileDownload = new Promise(
                function(resolve, reject) {
                    var check = checkRequiresToken(msg);
                    if  (check==true) {
                        resolve(requestWithToken(attachment.contentUrl));
                    } else {
                        resolve(request_promise(attachment.contentUrl));
                    }
                }
            );

            fileDownload.then(
                function (response) {

                readImageText(response, attachment.contentType, function (error, response, body) {
                    session.send(extractText(body));
                });

                }).catch(function (err, reply) {
                    console.log('Error with attachment: ', { 
                        statusCode: err.statusCode, 
                        message: err });
                        session.send("Error with attachment or reading image with %s", err);
            });
        } 
        // It's a url link
        else if (extractedUrl != "") {
            readImageTextUrl(extractedUrl, 'application/json', function (error, response, body) {
                session.send(extractText(body));
        })
    } else {
            session.send("Hi!  Try attaching an image or url link with words in it (jpeg, png, gif, or bmp work for me).")
        }
    }
]);

// Helper methods

// Request file with Authentication Header
var requestWithToken = function (url) {
    return obtainToken().then(function (token) {
        return request_promise({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
    return message.source === 'skype' || message.source === 'msteams';
};

//=========================================================
// Vision Service
//=========================================================

// A request with binary image data to OCR API
var readImageText = function _readImageText(url, content_type, callback) {

    var options = {
        method: 'POST',
        url: config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_URL + "ocr/",
        headers: {
            'Ocp-Apim-Subscription-Key': config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_KEY,
            'Content-Type': 'application/octet-stream'
        },
        body: url,
        json: false
    };
    request(options, callback);

};

var readImageTextUrl = function _readImageTextUrl(url, content_type, callback) {

    var options = {
        method: 'POST',
        url: config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_URL + "ocr/",
        headers: {
            'ocp-apim-subscription-key': config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_KEY,
            'content-type': content_type
        },
        body: {url: url, language: "en"},
        json: true
    };

    request(options, callback);

};

// Get the text if present in the response from service
var extractText = function _extractText(bodyMessage) {

    var bodyJson = bodyMessage;

    // The attached images are json strings, the urls are not
    //  so only convert if we need to
    if (IsJsonString(bodyMessage)) {
        bodyJson = JSON.parse(bodyMessage);
    }

    // The "regions" - part of the json to drill down first level
    var regs = bodyJson.regions;
    text = "";

    if (typeof regs === "undefined") {return "Something's amiss, please try again.";};

    // Get line arrays
    var allLines = regs.map(x => x.lines);
    // Flatten array
    var allLinesFlat =  [].concat.apply([], allLines);
    // Get the words objects
    var allWords = allLinesFlat.map(x => x.words);
    // Flatten array
    var allWordsFlat = [].concat.apply([], allWords);
    // Get the text
    var allText = allWordsFlat.map(x => x.text);
    // Flatten
    var allTextFlat = [].concat.apply([], allText);

    text = allTextFlat.join(" ");

    if (text) {
        return text;
    } else {
        return "Could not find text in this image. :( Try again?";
    }
};

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

//=========================================================
// URL Helpers
//=========================================================


var extractUrl = function _extractUrl(message) {

    if (message.type !== "message") return;

    if (typeof message.attachments !== "undefined"
        && message.attachments.length > 0) {
        return message.attachments[0].contentUrl;
    }

    if (typeof message.text !== "") {
        return _findUrl(message.text);
    }

    return "";
};


function _findUrl(text) {
    var source = (text || '').toString();
    var matchArray;

    // Regular expression to find FTP, HTTP(S) and email URLs.
    var regexToken = /(((http|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)/g;

    // Iterate through any URLs in the text.
    if ((matchArray = regexToken.exec(source)) !== null) {
        var token = matchArray[0];
        return token;
    }

    return "";
}

// a test image:  https://img0.etsystatic.com/045/0/6267543/il_570xN.665155536_842h.jpg

//============================================================
// Set up some trigger actions
//============================================================

// Example of a triggered action - when user types something matched by
// the trigger, this dialog begins, clearing the stack and interrupting
// the current dialog (so be cognizant of this).
// What if we had put 'send' instead of 'endDialog' here - try this.
bot.dialog('/bye', function (session) {
    // end dialog with a cleared stack.  we may want to add an 'onInterrupted'
    // handler to this dialog to keep the state of the current
    // conversation by doing something with the dialog stack
    session.endDialog("Ok... See you later.");
}).triggerAction({matches: /^bye|Bye/i});

