const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 🧠 LƯU LỊCH SỬ
// ======================
let history = [];

// ======================
// 🎲 TÍNH TÀI/XỈU
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
  history.push(result);
  if (history.length > 20) history.shift(); // giữ 20 phiên gần nhất
}

// ======================
// 🔍 DETECT PATTERN
// ======================
function detectPattern() {
  if (history.length < 4) return "Chưa đủ dữ liệu";

  const last3 = history.slice(-3).join("");
  const last4 = history.slice(-4).join("");

  if (last3 === "TàiTàiTài") return "Bệt Tài";
  if (last3 === "XỉuXỉuXỉu") return "Bệt Xỉu";

  if (last4 === "TàiXỉuTàiXỉu") return "Cầu 1-1";
  if (last4 === "XỉuTàiXỉuTài") return "Cầu 1-1";

  return "Ngẫu nhiên";
}

// ======================
// 🌐 TEST
// ======================
app.get("/", (req, res) => {
  res.send("API đang chạy 🚀");
});

// ======================
// 🎯 API
// ======================
app.get("/api/luck/md5", async (req, res) => {
  try {
    const response = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = response.data?.data;

    if (!data || !data.OpenCode) {
      return res.status(500).json({ error: "Data lỗi" });
    }

    const expect = data.Expect;
    const openTime = data.OpenTime;

    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);

    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    // cập nhật lịch sử
    updateHistory(ket_qua);

    const pattern = detectPattern();

    res.json({
      Phien_truoc: expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,
      Phien_hien_tai: nextExpect(expect),

      // 👇 thêm ở đây
      pattern: pattern,

      OpenTime: openTime
    });

  } catch (err) {
    res.status(500).json({
      error: "Fetch API lỗi",
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
