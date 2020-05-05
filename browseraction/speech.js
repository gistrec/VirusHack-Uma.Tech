var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList

var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();

speechRecognitionList.addFromString('#JSGF V1.0;', 1);
recognition.grammars = speechRecognitionList;
recognition.continuous = false;
recognition.lang = 'ru-RU';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function log(msg) {
    var time = new Date();
    time = ("0" + time.getHours()).slice(-2)   + ":" + 
           ("0" + time.getMinutes()).slice(-2) + ":" + 
           ("0" + time.getSeconds()).slice(-2);
    chrome.tabs.executeScript({
        code: `console.log("[${time}] ${msg}");`
    });
}

// Набор состояний
//    main        - на главной странице
//    wait_phone  - ждем ввода телефон
//    password    - на странице с паролем
//    wait_passwd - ждем ввода пароля
// TODO: Вынести в отдельный файл, когда будет время
var state = "main" // На главной странице

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
    log(`Пользователь сказал: '${transcript}', точность определения: ${confidence}`);

    if (state == "wait_phone") {
        const phone = transcript.replace(/ /g, '');

        log(`Установили телефон '${phone}'`)

        chrome.tabs.executeScript({
            code: `document.getElementsByClassName("phone__number")[0].value="${phone}"`
        });
        state = "password";
        return;
    }
    if (state == "wait_passwd") {
        const password = transcript.replace(/ /g, '');

        log(`Установили пароль '${password}'`)

        chrome.tabs.executeScript({
            code: `document.getElementsByName("password")[0].value="${password}"`
        });
        state = "done";
        return;
    }

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
            log(`Намерение пользователя: '${command}'`)

            if (command == "Ввод телефона" && state == "main") {
                log("Проигрывание звука 'Скажите номер телефона.m4a'")

                var myAudio = new Audio(chrome.runtime.getURL("sounds/Скажите номер телефона.m4a"));
                myAudio.play();

                state = "wait_phone";
            }
            if (command == "Ввод пароля" && state == "password") {
                log("Проигрывание звука 'Скажите свой пароль.m4a'")

                var myAudio = new Audio(chrome.runtime.getURL("sounds/Скажите свой пароль.m4a"));
                myAudio.play();

                state = "wait_passwd";                
            }
            if (command == undefined || command == "Неверная команда") {
                log("Проигрывание звука 'Команда не найдена.m4a'")

                var myAudio = new Audio(chrome.runtime.getURL("sounds/Команда не найдена.m4a"));
                myAudio.play();    
            }
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