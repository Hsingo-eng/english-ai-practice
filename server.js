require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// 設定中介軟體
app.use(cors()); // 允許前端跨域請求
app.use(express.json()); // 解析 JSON 格式的請求資料
app.use(express.static(__dirname));

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 使用 gemini-1.5-flash 模型，速度快且適合文字任務
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

app.post('/api/get-question', async (req, res) => {
  const { mode } = req.body;
  let systemPrompt = "";

  // 根據前端傳來的三種模式，給予不同的 Prompt
  if (mode === "opinion") {
    // 1. 發表觀點模式
    systemPrompt = "你是一位友善的英語老師。請出一個簡單、有趣且貼近日常生活的英文討論題，讓使用者練習表達個人觀點。主題請圍繞在：假設性情境、生活習慣、休閒娛樂、有趣新聞等。請用平易近人的語氣提問，避免政治或學術議題。請只輸出英文題目本身，不需要其他廢話。";
    
  } else if (mode === "engineer_interview") {
    // 2. 工程師面試模式
    systemPrompt = "你現在是一位外商科技公司的資深工程師兼面試官。請隨機詢問一個軟體工程師面試常見的 Behavioral Question (行為面試題) 或是關於團隊協作、解決技術困難的問題。請用專業但友善的語氣提問。請只輸出英文題目本身，不需要其他廢話。";
    
  } else {
    // 3. 日常問答模式 (預設或 mode === "daily_qa")
    // 請在這裡填入你原本「日常問答」使用的 Prompt
    systemPrompt = "請提出一個適合中階英語學習者的日常英文問答題，例如詢問天氣、週末計畫或喜好。請只輸出英文題目本身。"; 
  }

  try {
    // 呼叫 Gemini API 產生題目
    const result = await model.generateContent(systemPrompt);
    const question = result.response.text();
    
    res.json({ question: question });
  } catch (error) {
    console.error("API 錯誤:", error);
    res.status(500).send("AI 產生題目失敗");
  }
});

// ==========================================
// 路由 2：批改使用者的英文回答
// ==========================================
app.post('/api/evaluate', async (req, res) => {
    try {
        const { topic, userAnswer } = req.body;
        
        // 設計給 AI 的提示詞，要求它清楚區分「訂正後的句子」和「解釋」
        const prompt = `
        你是一個嚴格但友善的英文老師。
        我剛才被問到這個問題/議題： "${topic}"
        我的英文回答是： "${userAnswer}"
        
        請幫我檢查文法、句型、單字是否正確或可以更道地。
        請務必依照以下格式回覆我（不要加上 Markdown 的標記，純文字即可）：
        
        Corrected: [這裡填寫你訂正後最完美、最道地的完整英文句子，這句我之後要用來發音]
        Explanation: [這裡用繁體中文解釋我哪裡錯了，或者為什麼你這樣改比較好]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 簡單解析 AI 的回覆，把 Corrected 和 Explanation 分開
        const correctedMatch = text.match(/Corrected:\s*(.*)/i);
        const explanationMatch = text.match(/Explanation:\s*([\s\S]*)/i);

        const correctedSentence = correctedMatch ? correctedMatch[1].trim() : "無法解析訂正句子";
        const explanation = explanationMatch ? explanationMatch[1].trim() : text;

        res.json({ 
            corrected: correctedSentence, 
            explanation: explanation 
        });
    } catch (error) {
        console.error("批改時發生錯誤:", error);
        res.status(500).json({ error: "伺服器發生錯誤" });
    }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`後端伺服器已啟動，正在監聽 Port ${port} ...`);
});