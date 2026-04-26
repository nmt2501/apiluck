const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ======================
// 🎲 TÍNH TÀI/XỈU
// ======================
function getKetQua(sum) {
  return sum >= 11 ? "Tài" : "Xỉu";
}

// ======================
// 🔢 NEXT PHIÊN
// ======================
function nextExpect(expect) {
  return (parseInt(expect) + 1).toString();
}

// ======================
// 🌐 ROUTE TEST
// ======================
app.get("/", (req, res) => {
  res.send("API đang chạy 🚀");
});

// ======================
// 🎯 API CHÍNH
// ======================
app.get("/api/luck/md5", async (req, res) => {
  try {
    const response = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5"
    );

    const data = response.data?.data;

    if (!data) {
      return res.json({ error: "Không lấy được dữ liệu" });
    }

    const expect = data.Expect;
    const openTime = data.OpenTime;
    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);

    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    res.json({
      Phien_truoc: expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,
      Phien_hien_tai: nextExpect(expect),
      OpenTime: openTime
    });

  } catch (err) {
    res.status(500).json({
      error: "Lỗi fetch API",
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
