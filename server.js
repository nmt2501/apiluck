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

// ======================
// 🧠 SO SÁNH PATTERN
// ======================
function similarity(a, b) {
  let match = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) match++;
  }

  return (match / len) * 100;
}

// ======================
// 🤖 DỰ ĐOÁN + AI
// ======================
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
  // 🎯 DỰ ĐOÁN
  // ======================
  let du_doan = tai5 >= xiu5 ? "Tài" : "Xỉu";

  // ======================
  // 🔥 STREAK
  // ======================
  const lastChar = pattern.slice(-1);
  const streak = (pattern.match(new RegExp(lastChar + "+$")) || [""])[0].length;

  // ======================
  // 🔥 BLOCK PATTERN
  // ======================
  let blocks = [];
  let count = 1;

  for (let i = 1; i <= pattern.length; i++) {
    if (pattern[i] === pattern[i - 1]) {
      count++;
    } else {
      blocks.push(pattern[i - 1] + count);
      count = 1;
    }
  }

  const blockStr = blocks.join(" ");

  // ======================
  // 🔥 PATTERN TYPE
  // ======================
  let pattern_type = "Normal";

  if (blockStr.includes("T1 X2 T1") || blockStr.includes("X1 T2 X1")) {
    pattern_type = "Cầu 1-2-1 / 2-1-2";
  }

  if (blockStr.includes("T2 X2") || blockStr.includes("X2 T2")) {
    pattern_type = "Cầu 2-2";
  }

  if (blockStr.includes("T2") || blockStr.includes("X2")) {
    pattern_type = "Cầu 11 / 22";
  }

  if (pattern.includes("TXTXTX")) {
    pattern_type = "Cầu 1-1";
  }

  // ======================
  // 📈 TREND
  // ======================
  let trend = "Sideway";

  if (tai20 > xiu20 + 3) trend = "Up Tài";
  if (xiu20 > tai20 + 3) trend = "Up Xỉu";

  // ======================
  // ⚡ VOLATILITY
  // ======================
  let flip = 0;

  for (let i = 1; i < last10.length; i++) {
    if (last10[i] !== last10[i - 1]) flip++;
  }

  let volatility = Math.round((flip / 9) * 100);

  // ======================
  // 🔥 CẦU STATUS
  // ======================
  let cau_status = "Cầu ổn định";

  if (volatility < 35 && streak <= 3) cau_status = "Cầu an toàn";
  if (volatility > 70) cau_status = "Cầu loạn";
  if (streak >= 5 && volatility > 50) cau_status = "Cầu dễ gãy";
  if (flip >= 7 && volatility > 60) cau_status = "Cầu bị nhiễu";

  // ======================
  // 🔥 CẦU ĐANG THEO
  // ======================
  let cau_theo = "Không rõ";

  if (streak >= 3) {
    cau_theo = lastChar === "T" ? "Đang theo Tài" : "Đang theo Xỉu";
  }

  if (pattern_type.includes("1-1")) {
    cau_theo = "Đang theo cầu 1-1";
  }

  if (pattern_type.includes("1-2-1")) {
    cau_theo = "Đang theo cầu 1-2-1 / 2-1-2";
  }

  if (trend !== "Sideway") {
    cau_theo += ` | ${trend}`;
  }

  // ======================
  // 🧠 SMART CONFIDENCE (GIỮ NGUYÊN)
  // ======================
  let confidence = 0;

  const diff20 = tai20 - xiu20;
  if (Math.abs(diff20) >= 6) confidence += 30;
  else if (Math.abs(diff20) >= 4) confidence += 22;
  else if (Math.abs(diff20) >= 2) confidence += 15;
  else confidence += 8;

  if (cau_status === "Cầu an toàn") confidence += 30;
  else if (cau_status === "Cầu ổn định") confidence += 22;
  else if (cau_status === "Cầu dễ gãy") confidence += 10;
  else confidence += 5;

  if (volatility < 25) confidence += 20;
  else if (volatility < 40) confidence += 15;
  else if (volatility < 60) confidence += 10;
  else confidence += 3;

  if (pattern_type.includes("1-2-1")) confidence += 15;
  else if (pattern_type.includes("1-1")) confidence += 12;
  else if (pattern_type.includes("11") || pattern_type.includes("22")) confidence += 8;
  else confidence += 5;

  const balance = Math.abs(tai10 - xiu10);
  if (balance <= 1) confidence += 5;
  else if (balance <= 2) confidence += 3;
  else confidence += 1;

  confidence = Math.min(96, Math.round(confidence));

  // ======================
  // 🔁 SMART REVERSE (MỚI THÊM)
  // ======================
  let reversal_signal = 0;

  if (streak >= 5) reversal_signal += 30;
  else if (streak >= 4) reversal_signal += 20;

  if (volatility > 70) reversal_signal += 30;
  else if (volatility > 50) reversal_signal += 20;

  if (Math.abs(diff20) <= 2) reversal_signal += 15;

  if (cau_status === "Cầu dễ gãy") reversal_signal += 20;
  if (cau_status === "Cầu loạn") reversal_signal += 25;

  if (flip >= 7) reversal_signal += 15;

  reversal_signal = Math.min(100, reversal_signal);

  // ======================
  // 🔮 FINAL DECISION (TỰ ĐẢO)
  // ======================
  let final_du_doan = du_doan;

  if (reversal_signal >= 70) {
    final_du_doan = du_doan === "Tài" ? "Xỉu" : "Tài";
  }

  if (reversal_signal >= 85) {
    final_du_doan = "Cẩn thận đảo chiều";
  }

  // ======================
  // LEVEL
  // ======================
  let level = "LOW";
  if (confidence >= 85) level = "VERY HIGH";
  else if (confidence >= 70) level = "HIGH";
  else if (confidence >= 50) level = "MEDIUM";

  // ======================
  // 📦 RETURN
  // ======================
  return {
    du_doan: final_du_doan,
    do_tin_cay: `${confidence}%`,
    do_tin_cay_level: level,

    reversal_signal: `${reversal_signal}%`,

    tong_quan: `${cau_status} | ${trend}`,
    pattern_type,
    cau_status,
    cau_theo,

    chi_tiet: [
      `Pattern: ${pattern.slice(-10)}`,
      `Block: ${blockStr}`,
      `5 phiên: Tài ${tai5} - Xỉu ${xiu5}`,
      `10 phiên: Tài ${tai10} - Xỉu ${xiu10}`,
      `20 phiên: Tài ${tai20} - Xỉu ${xiu20}`,
      `Cầu trạng thái: ${cau_status}`,
      `Cầu đang theo: ${cau_theo}`,
      `Trend: ${trend}`,
      `Volatility: ${volatility}%`,
      `Reversal: ${reversal_signal}%`
    ]
  };
}

// ======================
// 🔄 FETCH (UPGRADED)
// ======================
async function fetchData() {
  try {
    const res = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = res.data?.data;
    if (!data || !data.OpenCode) return;

    // ======================
    // 🔥 CHẶN TRÙNG + FIX LỖI LỆCH PHIÊN
    // ======================
    if (lastExpect && data.Expect === lastExpect) {
      console.log("⏳ chưa có phiên mới:", data.Expect);
      return;
    }

    lastExpect = data.Expect;

    // ======================
    // 🎲 XỬ LÝ XÚC XẮC
    // ======================
    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);
    const tong = x1 + x2 + x3;

    const ket_qua = getKetQua(tong);

    // ======================
    // 🧠 UPDATE HISTORY
    // ======================
    updateHistory(ket_qua);

    // ======================
    // 🤖 AI ANALYZE
    // ======================
    const ai = analyzeAI(history);

    // ======================
    // 📦 BUILD RESPONSE
    // ======================
    currentData = {
      Phien_truoc: data.Expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,

      Phien_hien_tai: nextExpect(data.Expect),

      pattern: getPattern(),

      // ======================
      // 🔥 AI OUTPUT
      // ======================
      du_doan: ai.du_doan,
      do_tin_cay: ai.do_tin_cay,
      do_tin_cay_level: ai.do_tin_cay_level,

      reversal_signal: ai.reversal_signal,

      cau_status: ai.cau_status,
      cau_theo: ai.cau_theo,
      pattern_type: ai.pattern_type,

      chi_tiet: ai.chi_tiet,

      OpenTime: data.OpenTime
    };

    console.log(
      "✅ NEW:",
      currentData.Phien_truoc,
      "|",
      currentData.ket_qua,
      "| AI:",
      ai.du_doan,
      "| CONF:",
      ai.do_tin_cay
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
