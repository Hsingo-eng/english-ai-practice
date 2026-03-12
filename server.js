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

// ==========================================
// 路由 1：獲取 AI 提問 (Q&A) 或 議題 (Opinion)
// ==========================================
app.post('/api/get-topic', async (req, res) => {
    try {
        const { type } = req.body; // 接收前端傳來的練習類型 ('qa' 或 'opinion')
        let prompt = "";

        if (type === 'qa') {
            prompt = "你是一個英文老師。請用英文問我一個簡短的日常問題，讓我可以用一兩句話回答。只要輸出問題就好，不需要其他問候語。";
        } else if (type === 'opinion') {
            prompt = "你是一個英文老師。請用英文提出一個有趣且具爭議性的簡短議題（例如科技、環保、生活習慣），讓我發表觀點。只要輸出議題就好，不需要其他問候語。";
        } else {
            return res.status(400).json({ error: "無效的練習類型" });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ topic: text });
    } catch (error) {
        console.error("獲取題目時發生錯誤:", error);
        res.status(500).json({ error: "伺服器發生錯誤" });
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