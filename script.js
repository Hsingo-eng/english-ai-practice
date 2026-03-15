const btnQA = document.getElementById('btn-qa');
const btnOpinion = document.getElementById('btn-opinion');
const getTopicBtn = document.getElementById('get-topic-btn');
const topicDisplay = document.getElementById('topic-display');
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBox = document.getElementById('result-box');
const correctedText = document.getElementById('corrected-text');
const explanationText = document.getElementById('explanation-text');

let currentMode = 'qa';
let currentTopic = '';

// 切換練習模式
btnQA.addEventListener('click', () => {
    currentMode = 'qa';
    btnQA.classList.add('active');
    btnOpinion.classList.remove('active');
    resetUI();
});

btnOpinion.addEventListener('click', () => {
    currentMode = 'opinion';
    btnOpinion.classList.add('active');
    btnQA.classList.remove('active');
    resetUI();
});

function resetUI() {
    topicDisplay.textContent = "點擊上方按鈕獲取題目...";
    userInput.value = '';
    resultBox.classList.add('hidden');
    currentTopic = '';
}

// 接收按鈕傳來的 mode 字串
async function generateQuestion(selectedMode) {
  try {
    // 可以在這裡先讓畫面顯示「載入中...」
    document.getElementById('questionDisplay').innerText = "AI 正在思考題目中...";

    const response = await fetch('/api/get-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // 把接收到的 selectedMode 傳給後端
      body: JSON.stringify({ mode: selectedMode }) 
    });

    const data = await response.json();
    
    // 把後端回傳的題目顯示到畫面上
    document.getElementById('questionDisplay').innerText = data.question;

  } catch (error) {
    console.error("發生錯誤:", error);
    document.getElementById('questionDisplay').innerText = "產生題目失敗，請再試一次。";
  }
}

// 送出回答讓 AI 批改
submitBtn.addEventListener('click', async () => {
    const answer = userInput.value.trim();
    if (!currentTopic || !answer) {
        alert("請先獲取題目並輸入您的回答！");
        return;
    }

    submitBtn.textContent = "AI 正在嚴格批改中...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, userAnswer: answer })
        });
        const data = await response.json();

        correctedText.textContent = data.corrected;
        explanationText.textContent = data.explanation;
        resultBox.classList.remove('hidden'); // 顯示結果區塊
    } catch (error) {
        alert("批改失敗，請檢查連線。");
    } finally {
        submitBtn.textContent = "送出批改";
        submitBtn.disabled = false;
    }
});
// ==========================================
// 第四階段：發音功能 (Web Speech API)
// ==========================================
const speakBtn = document.getElementById('speak-btn');

speakBtn.addEventListener('click', () => {
    // 1. 取得畫面上 AI 訂正後的句子
    const textToSpeak = correctedText.textContent;

    // 簡單防呆：如果沒有句子就不執行
    if (!textToSpeak || textToSpeak === "解析失敗") {
        alert("目前沒有可以朗讀的句子喔！請先送出回答讓 AI 批改。");
        return;
    }

    // 2. 建立語音合成物件
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // 3. 設定語音屬性
    utterance.lang = 'en-US'; // 設定語言為美式英文
    utterance.rate = 0.9;     // 語速設定 (預設是 1，設定 0.9 稍微放慢，更適合練習聽力)
    utterance.pitch = 1;      // 音調設定 (預設是 1)

    // 4. 呼叫瀏覽器播放語音
    window.speechSynthesis.speak(utterance);
});