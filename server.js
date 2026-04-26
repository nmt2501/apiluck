const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 🧠 CACHE
// ======================
let currentData = null;
let history = [];
let lastExpect = null;

// ======================
// 🎲 TÀI/XỈU
// ======================
function getKetQua(sum) {
  return sum <= 10 ? "Xỉu" : "Tài";
}

// ======================
// 🔢 NEXT PHIÊN
// ======================
function nextExpect(expect) {
  return (parseInt(expect) + 1).toString();
}

// ======================
// 🧠 UPDATE HISTORY
// ======================
function updateHistory(result) {
  const val = result === "Tài" ? "T" : "X";

  history.push(val);
  if (history.length > 50) history.shift();
}

// ======================
// 🔍 PATTERN
// ======================
function getPattern() {
  return history.join("");
}

function similarity(a, b) {
  if (!a || !b) return 0;

  const A = a.split("");
  const B = b.split("");

  const len = Math.min(A.length, B.length);

  let score = 0;

  // ======================
  // 1. MATCH DIRECT (nhẹ)
  // ======================
  let direct = 0;
  for (let i = 0; i < len; i++) {
    if (A[i] === B[i]) direct++;
  }

  const directScore = (direct / len) * 40; // chỉ 40% trọng số

  // ======================
  // 2. TRANSITION MATCH (QUAN TRỌNG)
  // so sánh chuyển trạng thái T→X, X→T
  // ======================
  let transA = [];
  let transB = [];

  for (let i = 1; i < len; i++) {
    transA.push(A[i] === A[i - 1] ? "S" : "F"); // Same / Flip
    transB.push(B[i] === B[i - 1] ? "S" : "F");
  }

  let transMatch = 0;
  for (let i = 0; i < transA.length; i++) {
    if (transA[i] === transB[i]) transMatch++;
  }

  const transScore = (transMatch / Math.max(1, transA.length)) * 40;

  // ======================
  // 3. PATTERN STRUCTURE (BỆT / ĐẢO / MIX)
  // ======================
  const typeA = detectType(A);
  const typeB = detectType(B);

  let structureScore = typeA === typeB ? 20 : 0;

  // ======================
  // FINAL SCORE
  // ======================
  score = directScore + transScore + structureScore;

  return Math.min(100, Math.round(score));
}

// ======================
// 🧠 DETECT PATTERN TYPE
// ======================
function detectType(arr) {
  let streak = 1;
  let maxStreak = 1;
  let flip = 0;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1]) {
      streak++;
    } else {
      maxStreak = Math.max(maxStreak, streak);
      streak = 1;
      flip++;
    }
  }

  maxStreak = Math.max(maxStreak, streak);

  if (maxStreak >= 4) return "BET";
  if (flip >= arr.length * 0.6) return "DAO";
  return "MIX";
}

function analyzeAI(history) {
  if (history.length < 5) {
    return {
      du_doan: "Chưa đủ dữ liệu",
      do_tin_cay: "0%",
      do_tin_cay_level: "LOW",
      tong_quan: "Chưa đủ 5 phiên",
      pattern_type: "Chưa xác định",
      cau_status: "Chưa xác định",
      cau_theo: "Chưa xác định",
      reversal_signal: "0%",
      chi_tiet: []
    };
  }

  const pattern = history.join("");

  // ======================
  // 📊 BASIC DATA
  // ======================
  const last5 = pattern.slice(-5);
  const last10 = pattern.slice(-10);
  const last20 = pattern.slice(-20);

  const tai5 = [...last5].filter(x => x === "T").length;
  const xiu5 = [...last5].filter(x => x === "X").length;

  const tai10 = [...last10].filter(x => x === "T").length;
  const xiu10 = [...last10].filter(x => x === "X").length;

  const tai20 = [...last20].filter(x => x === "T").length;
  const xiu20 = [...last20].filter(x => x === "X").length;

  // ======================
  // 🎯 DỰ ĐOÁN GỐC
  // ======================
  let du_doan = tai5 >= xiu5 ? "Tài" : "Xỉu";

  // ======================
  // 🔥 STREAK
  // ======================
  const lastChar = pattern.slice(-1);
  const streak = (pattern.match(new RegExp(lastChar + "+$")) || [""])[0].length;

  // ======================
  // 🧠 UNIVERSAL BLOCK ENGINE (QUAN TRỌNG NHẤT)
  // ======================
  let blocks = [];
  let count = 1;

  for (let i = 1; i <= pattern.length; i++) {
    if (pattern[i] === pattern[i - 1]) {
      count++;
    } else {
      blocks.push({ type: pattern[i - 1], len: count });
      count = 1;
    }
  }

  const blockStr = blocks.map(b => b.type + b.len).join(" ");

  const avgBlock =
    blocks.reduce((sum, b) => sum + b.len, 0) / blocks.length;

  // ======================
  // 🔥 UNIVERSAL PATTERN DETECTION
  // ======================
  let pattern_type = "Normal";

  const isZigZag = /TXTX|XTXT/.test(pattern);
  const isStrongTrend = streak >= 4;
  const isLongRepeat = avgBlock >= 3;
  const isShortFlip = avgBlock <= 1.5;

  if (isZigZag) pattern_type = "Cầu zigzag (1-1 biến thể)";
  else if (isLongRepeat) pattern_type = "Cầu bệt dài";
  else if (isShortFlip) pattern_type = "Cầu đảo nhanh";
  else if (streak >= 5) pattern_type = "Cầu bệt mạnh";
  else if (/T2 X2|X2 T2/.test(blockStr)) pattern_type = "Cầu 2-2";
  else if (/T1 X2 T1|X1 T2 X1/.test(blockStr)) pattern_type = "Cầu 1-2-1 / 2-1-2";

  // ======================
  // 📈 TREND
  // ======================
  let trend = "Sideway";

  if (tai20 > xiu20 + 3) trend = "Up Tài";
  if (xiu20 > tai20 + 3) trend = "Up Xỉu";

  // ======================
  // ⚡ VOLATILITY (CHUẨN HÓA)
  // ======================
  let flip = 0;

  for (let i = 1; i < last10.length; i++) {
    if (last10[i] !== last10[i - 1]) flip++;
  }

  const volatility = (flip / Math.max(1, last10.length - 1)) * 100;

  // ======================
  // 🔥 CẦU STATUS (THÔNG MINH HƠN)
  // ======================
  let cau_status = "Cầu ổn định";

  if (volatility < 25 && avgBlock >= 2) cau_status = "Cầu an toàn";
  if (volatility > 75) cau_status = "Cầu loạn";
  if (streak >= 5 && volatility > 50) cau_status = "Cầu dễ gãy";
  if (volatility > 60 && flip >= 7) cau_status = "Cầu nhiễu";

  // ======================
  // 🔥 CẦU ĐANG THEO
  // ======================
  let cau_theo = "Không rõ";

  if (streak >= 3) {
    cau_theo = lastChar === "T" ? "Theo Tài" : "Theo Xỉu";
  }

  if (pattern_type.includes("zigzag")) cau_theo = "Theo cầu 1-1";
  if (pattern_type.includes("1-2-1")) cau_theo = "Theo 1-2-1";
  if (pattern_type.includes("2-2")) cau_theo = "Theo 2-2";

  if (trend !== "Sideway") cau_theo += ` | ${trend}`;

  // ======================
  // 🧠 VIP CONFIDENCE ENGINE
  // ======================
  let confidence = 0;

  const diff20 = tai20 - xiu20;

  // trend power
  confidence += Math.min(30, Math.abs(diff20) * 3);

  // pattern strength
  if (pattern_type === "Cầu zigzag (1-1 biến thể)") confidence += 20;
  else if (pattern_type === "Cầu 2-2") confidence += 18;
  else if (pattern_type === "Cầu 1-2-1 / 2-1-2") confidence += 22;
  else if (pattern_type === "Cầu bệt dài") confidence += 10;

  // stability
  if (cau_status === "Cầu an toàn") confidence += 25;
  if (cau_status === "Cầu ổn định") confidence += 18;
  if (cau_status === "Cầu dễ gãy") confidence += 5;

  // volatility impact
  if (volatility < 25) confidence += 20;
  else if (volatility < 45) confidence += 12;
  else if (volatility < 65) confidence += 6;
  else confidence += 2;

  // balance
  const balance = Math.abs(tai10 - xiu10);
  confidence += balance <= 1 ? 8 : balance <= 2 ? 5 : 2;

  // streak penalty
  if (streak >= 6) confidence -= 10;

  confidence = Math.max(0, Math.min(97, Math.round(confidence)));

  // ======================
  // 🔁 REVERSE SIGNAL
  // ======================
  let reversal_signal = 0;

  if (streak >= 5) reversal_signal += 30;
  if (volatility > 70) reversal_signal += 25;
  if (Math.abs(diff20) <= 2) reversal_signal += 15;
  if (cau_status === "Cầu dễ gãy") reversal_signal += 20;
  if (cau_status === "Cầu loạn") reversal_signal += 25;
  if (flip >= 7) reversal_signal += 10;

  reversal_signal = Math.min(100, reversal_signal);

  // ======================
  // 🔮 FINAL DECISION
  // ======================
  let final_du_doan = du_doan;

  if (reversal_signal >= 70) {
    final_du_doan = du_doan === "Tài" ? "Xỉu" : "Tài";
  }

  if (reversal_signal >= 85) {
    final_du_doan = "Cẩn thận đảo chiều";
  }

  // ======================
  // 🧠 LEVEL
  // ======================
  let level = "LOW";
  if (confidence >= 88) level = "VERY HIGH";
  else if (confidence >= 72) level = "HIGH";
  else if (confidence >= 52) level = "MEDIUM";

  // ======================
  // 📦 RETURN
  // ======================
  return {
    du_doan: final_du_doan,
    do_tin_cay: `${confidence}%`,
    do_tin_cay_level: level,

    reversal_signal: `${reversal_signal}%`,

    pattern_type,
    cau_status,
    cau_theo,
    tong_quan: `${cau_status} | ${trend}`,

    chi_tiet: [
      `Pattern: ${pattern.slice(-10)}`,
      `Block: ${blockStr}`,
      `AvgBlock: ${avgBlock.toFixed(2)}`,
      `5p: T${tai5}-X${xiu5}`,
      `10p: T${tai10}-X${xiu10}`,
      `20p: T${tai20}-X${xiu20}`,
      `Cầu: ${cau_status}`,
      `Theo: ${cau_theo}`,
      `Trend: ${trend}`,
      `Volatility: ${volatility.toFixed(1)}%`,
      `Streak: ${streak}`
    ]
  };
}

async function fetchData() {
  try {
    const res = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = res.data?.data;
    if (!data || !data.OpenCode || !data.Expect) return;

    // ======================
    // 🔥 SAFE CHECK (KHÔNG MISS PHIÊN)
    // ======================
    if (lastExpect === data.Expect) {
      console.log("⏳ chưa có phiên mới:", data.Expect);
      return;
    }

    // ======================
    // 🎯 LƯU EXPECT CŨ (DEBUG + TRACE)
    // ======================
    const prevExpect = lastExpect;
    lastExpect = data.Expect;

    // ======================
    // 🎲 XỬ LÝ XÚC XẮC
    // ======================
    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);
    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    // ======================
    // 🧠 HISTORY UPDATE (GIỮ EXPECT TRACE)
    // ======================
    updateHistory(ket_qua);

    // ======================
    // 🤖 AI ANALYZE
    // ======================
    const ai = analyzeAI(history);

    // ======================
    // 📊 PATTERN SAFE
    // ======================
    const pattern = getPattern();

    // ======================
    // 📦 BUILD DATA (FULL DEBUG READY)
    // ======================
    currentData = {
      // ======================
      // 📌 PHIÊN
      // ======================
      Phien_truoc: data.Expect,
      Phien_cu: prevExpect,
      Phien_hien_tai: nextExpect(data.Expect),

      // ======================
      // 🎲 KẾT QUẢ
      // ======================
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong,
      ket_qua,

      // ======================
      // 📊 PATTERN
      // ======================
      pattern,

      // ======================
      // 🤖 AI OUTPUT
      // ======================
      du_doan: ai.du_doan,
      do_tin_cay: ai.do_tin_cay,
      do_tin_cay_level: ai.do_tin_cay_level,

      reversal_signal: ai.reversal_signal,

      cau_status: ai.cau_status,
      cau_theo: ai.cau_theo,
      pattern_type: ai.pattern_type,

      // ======================
      // 📋 DEBUG / AI TRACE (QUAN TRỌNG)
      // ======================
      history_length: history.length,
      last_result: history.slice(-1)[0],

      chi_tiet: ai.chi_tiet,

      OpenTime: data.OpenTime
    };

    // ======================
    // 🧾 LOG CLEAN
    // ======================
    console.log(
      `✅ ${data.Expect} | ${ket_qua} | AI: ${ai.du_doan} | CONF: ${ai.do_tin_cay}`
    );

  } catch (err) {
    console.log("❌ Fetch lỗi:", err.message);
  }
}
// ======================
// START
// ======================
async function loopFetch() {
  try {
    await fetchData();
  } catch (e) {}

  // 🔥 không cố định 3s nữa
  setTimeout(loopFetch, 1200);
}

(async () => {
  await fetchData();   // load ngay
  loopFetch();         // chạy realtime
})();

// ======================
// ROUTE
// ======================
app.get("/", (req, res) => {
  res.send("API đang chạy 🚀");
});

app.get("/api/luck/md5", (req, res) => {
  if (!currentData) {
    return res.json({ error: "Chưa có dữ liệu" });
  }

  res.json(currentData);
});

app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
