var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition

var recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'ru-RU';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function log(msg) {
    chrome.tabs.executeScript({
        code: `console.log("${msg}");`
    });
}

recognition.onresult = function(event) {
    // The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
    // The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
    // It has a getter so it can be accessed like an array
    // The first [0] returns the SpeechRecognitionResult at the last position.
    // Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
    // These also have getters so they can be accessed like arrays.
    // The second [0] returns the SpeechRecognitionAlternative at position 0.
    // We then return the transcript property of the SpeechRecognitionAlternative object
    var transcript = event.results[0][0].transcript;
    var confidence = event.results[0][0].confidence;
    log(confidence);
    log(transcript);

    $.ajax({
        type: "GET",
        url: `https://api.dialogflow.com/v1/query`, 
        data: {
            "v": "20150910",
            "lang": "ru",
            "query": transcript,
            "sessionId": "1" // Сессия захардкожена
        },
        headers: {"Authorization": "Bearer 94966a3a848f46f3a79f26b967db490c"},
        success: function(data) {
            // Название интента - команда
            var command = data.result.metadata.intentName;
        },
        error: function(xhr, status, error) {
            alert("Возникла ошибка при запросе на DialogFlow");
        }
    });
}

recognition.onspeechend = function() {
    log('Запись команды остановлена');
    recognition.stop();
}
    
recognition.onerror = function(event) {
    log(JSON.stringify(event).replace(/\"/g, "'"));
    log('Произошла ошибка во время записи команды');
}