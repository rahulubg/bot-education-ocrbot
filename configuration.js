var _config = {
    CHAT_CONNECTOR: {
        APP_ID: process.env.MICROSOFT_APP_ID, //You can obtain an APP ID and PASSWORD here: https://dev.botframework.com/bots/new
        APP_PASSWORD: process.env.MICROSOFT_APP_PASSWORD       
    },
    
    COMPUTER_VISION_SERVICE: {
        API_URL: "https://eastus.api.cognitive.microsoft.com/vision/v1.0/ocr?language=unk&detectOrientation =true",
        API_KEY: "ef46e2e021394aab92ca2d2eb57930b6"  //You can obtain an COGNITIVE SERVICE API KEY: https://www.microsoft.com/cognitive-services/en-us/pricing
    }
};
exports.CONFIGURATIONS = _config;
