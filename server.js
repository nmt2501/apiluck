const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 🧠 CACHE DATA
// ======================
let currentData = null;
let history = [];

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
  if (history.length > 20) history.shift();
}

// ======================
// 🔍 PATTERN
// ======================
function getPattern() {
  return history.join("");
}

// ======================
// 🔄 AUTO FETCH
// ======================
async function fetchData() {
  try {
    const res = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = res.data?.data;
    if (!data || !data.OpenCode) return;

    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);
    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    updateHistory(ket_qua);

    currentData = {
      Phien_truoc: data.Expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,
      Phien_hien_tai: nextExpect(data.Expect),
      pattern: getPattern(),
      OpenTime: data.OpenTime
    };

    console.log("UPDATED:", currentData.Phien_truoc, currentData.pattern);

  } catch (err) {
    console.log("Fetch lỗi:", err.message);
  }
}

// chạy ngay khi start
fetchData();

// chạy mỗi 3 giây
setInterval(fetchData, 3000);

// ======================
// 🌐 ROUTE
// ======================
app.get("/", (req, res) => {
  res.send("Xem Cái Địt Mẹ Mày - Đéo Phải Api Share Đâu Nhé");
});

// ======================
// 🎯 API TRẢ CACHE
// ======================
app.get("/api/luck/md5", (req, res) => {
  if (!currentData) {
    return res.json({ error: "Chưa có dữ liệu" });
  }

  res.json(currentData);
});

app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
