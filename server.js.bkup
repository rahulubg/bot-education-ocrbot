var restify = require('restify');
var builder = require('botbuilder');
var config = require('./configuration');

//=========================================================
// Bot Setup
//=========================================================

/******** FOR TESTING WITH CONSOLE CONNECTION *********

// Create chat bot
// Create bot and bind to console
var connector = new builder.ConsoleConnector().listen();
var bot = new builder.UniversalBot(connector);

******************************************************/


/******** FOR USE WITH BOT EMULATOR AND/OR FOR DEPLOYMENT *********
*/

// Get secrets from server environment
var botConnectorOptions = { 
    appId: config.CONFIGURATIONS.CHAT_CONNECTOR.APP_ID, 
    appPassword: config.CONFIGURATIONS.CHAT_CONNECTOR.APP_PASSWORD
};

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector);

// Setup Restify Server
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', connector.listen());

// Serve a static web page - for testing deployment
server.get(/.*/, restify.serveStatic({
	'directory': '.',
	'default': 'index.html'
}));

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});

/*
****************************************************************/

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {

    var extractedUrl = extractUrl(session.message);

    if (extractedUrl === "") {
        session.send("Hello.  My name is OCRBot.  Please give me an image link and I'll look for words.");
    }

    readImageText(extractedUrl, function (error, response, body) {
        session.send(extractText(body));
    })
});

//=========================================================
// Vision Service
//=========================================================

var request = require("request");

var readImageText = function _readImageText(url, callback) {

    var options = {
        method: 'POST',
        url: config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_URL + "ocr/",
        headers: {
            'ocp-apim-subscription-key': config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_KEY,
            'content-type': 'application/json'
        },
        body: {url: url, language: "en"},
        json: true
    };

    request(options, callback);

};

var extractText = function _extractText(bodyMessage) {

    if (typeof bodyMessage.regions === "undefined") return "";

    var regs = bodyMessage.regions;

    if (typeof regs[0] !== "undefined" &&
        regs[0].lines.length > 0) {

        text = "";

        var lines = regs[0].lines;

        // For all lines in image ocr result
        //   grab the text in the words array
        for (i = 0; i < lines.length; i++) {
            var words = lines[i].words;
            for (j = 0; j < words.length; j++) {
                text += " " + words[j].text + " ";
            }
        }

        return text;
    }

    return "Sorry, I can't find text in it :( !";
};

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

