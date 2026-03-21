// ==========================================
// 第一階段：取得 HTML 元素
// ==========================================
// (把沒用到的舊按鈕 ID 刪除了，讓程式更輕量)
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBox = document.getElementById('result-box');
const correctedText = document.getElementById('corrected-text');
const explanationText = document.getElementById('explanation-text');

// 設定預設模式與當前題目
let currentMode = 'daily_qa'; 
let currentTopic = '';

// ==========================================
// 第二階段：切換模式與出題功能
// ==========================================

// 1. 切換模式的函式 (由 HTML 的 onclick 觸發)
function changeMode(selectedMode) {
    currentMode = selectedMode; // 更新當前的模式記錄

    // 把所有按鈕的 active 顏色清掉
    document.querySelectorAll('#mode-buttons button').forEach(btn => btn.classList.remove('active'));
  
    // 幫剛剛被點擊的按鈕塗上 active 顏色
    document.getElementById('btn-' + selectedMode).classList.add('active');

    // 切換模式時，順便重置畫面
    resetUI();
}

// 2. 重置畫面的函式
function resetUI() {
    document.getElementById('questionDisplay').innerText = "請點擊下方「請 AI 出題」獲取題目";
    userInput.value = '';
    resultBox.classList.add('hidden');
    currentTopic = ''; // 清空上一題的紀錄
}

// 3. 呼叫後端產生題目的函式
async function generateQuestion() {
    try {
        document.getElementById('questionDisplay').innerText = "AI 正在思考題目中";

        const response = await fetch('/api/get-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // 把現在的模式傳給後端
            body: JSON.stringify({ mode: currentMode }) 
        });

        const data = await response.json();
        
        // 將後端傳來的題目顯示在畫面上
        document.getElementById('questionDisplay').innerText = data.question;
        
        // 【重要修復】把拿到的題目存進 currentTopic，送出批改時才不會報錯！
        currentTopic = data.question; 

    } catch (error) {
        console.error("發生錯誤:", error);
        document.getElementById('questionDisplay').innerText = "產生題目失敗，請再試一次。";
    }
}

// ==========================================
// 第三階段：送出回答讓 AI 批改
// ==========================================
submitBtn.addEventListener('click', async () => {
    const answer = userInput.value.trim();
    
    // 檢查是否有題目與回答
    if (!currentTopic || !answer) {
        alert("請先獲取題目並輸入您的完整回答！");
        return;
    }

    // 改變按鈕狀態，防止重複點擊
    submitBtn.textContent = "AI 正在嚴格批改中";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 把題目和使用者的回答一起傳給後端
            body: JSON.stringify({ topic: currentTopic, userAnswer: answer })
        });
        const data = await response.json();

        // 顯示批改結果
        correctedText.textContent = data.corrected;
        explanationText.textContent = data.explanation;
        resultBox.classList.remove('hidden'); 
        
    } catch (error) {
        alert("批改失敗，請檢查連線。");
        console.error("批改錯誤:", error);
    } finally {
        // 恢復按鈕狀態
        submitBtn.textContent = "送出批改";
        submitBtn.disabled = false;
    }
});

// ==========================================
// 第四階段：發音功能 (Web Speech API)
// ==========================================
const speakBtn = document.getElementById('speak-btn');

speakBtn.addEventListener('click', () => {
    const textToSpeak = correctedText.textContent;

    if (!textToSpeak || textToSpeak === "解析失敗") {
        alert("目前沒有可以朗讀的句子喔！請先送出回答讓 AI 批改。");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.9;     
    utterance.pitch = 1;      

    window.speechSynthesis.speak(utterance);
});